import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { RecommendedActionService } from '../session-action/recommended-action.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { FORBIDDEN_CLINICAL_TERMS } from '../counselor/counselor-case.service';
import {
  ParentNotificationChannel,
  ParentNotificationLogEntity,
  ParentNotificationStatus,
} from '../communication/entities/parent-notification-log.entity';

/** MHA-134 — AC #69. Reuses CounselorCaseService's proven, non-false-positive-prone
 * FORBIDDEN_CLINICAL_TERMS list, plus severity/risk vocabulary. `'risk'` alone blocks all 7 risk
 * category names (they're all literally `..._risk`); `'addiction'` alone blocks all 4
 * addiction-related domain names. Deliberately does not enumerate all 21 individual domain names
 * — they're admin-configurable (FR-MHA-36) and would go stale; this targets clinical/diagnostic
 * vocabulary, which is what AC #69's "no clinical language" actually cares about. */
export const PARENT_NOTIFICATION_BANNED_TERMS = [
  ...FORBIDDEN_CLINICAL_TERMS,
  'risk',
  'severe',
  'high',
  'moderate',
  'addiction',
  'domain',
  'screening',
  'assessment',
  'symptom',
  'clinical',
];

/** AC #69 — exact wording, kept as a single source of truth so the regression content-test can
 * assert this literal string never contains any banned term. */
export function buildWellbeingCheckInTemplate(studentName: string): string {
  return `A wellbeing check-in has been recommended for ${studentName}. Please contact the school counselor for a conversation.`;
}

export interface NotifyGuardiansResult {
  guardiansNotified: number;
}

/** MHA-134 — FR-MHA-33. Manual, counselor-triggered, non-clinical guardian notification.
 * Dispatch mirrors AbsenceNotificationListener's precedent: SmsService/PushService injected
 * directly (always SMS, push only if pushToken set), plus an in-app copy via the existing
 * NotificationService.createForGuardian(). Each (guardian, channel) outcome is logged
 * independently to ParentNotificationLogEntity — a partial failure never blocks the rest. */
@Injectable()
export class MhaParentNotificationService {
  private readonly logger = new Logger(MhaParentNotificationService.name);

  constructor(
    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ParentNotificationLogEntity)
    private readonly logRepo: Repository<ParentNotificationLogEntity>,

    private readonly recommendedActionService: RecommendedActionService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  async notifyGuardians(
    sessionId: string,
    note: string | undefined,
    actorId: string,
  ): Promise<NotifyGuardiansResult> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`MHA session ${sessionId} not found.`);
    }
    if (session.status !== MhaSessionStatus.COMPLETE) {
      throw new ConflictException(`Session ${sessionId} must be completed first.`);
    }

    // AC #68 — the action is only meaningful once the session has produced at least one
    // Recommended Action; enforced here (not just hidden in the UI), matching NFR-MHA-04.
    const actions = await this.recommendedActionService.getPersistedActions(sessionId);
    if (actions.length === 0) {
      throw new UnprocessableEntityException(
        'No recommended actions exist for this session — there is nothing to base a guardian notification on.',
      );
    }

    if (note) {
      this.assertNoClinicalLanguage(note);
    }

    const student = await this.studentRepo.findOne({
      where: { id: session.studentId },
      relations: ['studentGuardians', 'studentGuardians.guardian'],
    });
    const guardians = (student?.studentGuardians ?? []).map((sg) => sg.guardian);
    if (guardians.length === 0) {
      throw new UnprocessableEntityException('No guardians linked to this student.');
    }

    const studentName = `${student!.firstName} ${student!.lastName}`;
    const body = note
      ? `${buildWellbeingCheckInTemplate(studentName)} ${note}`
      : buildWellbeingCheckInTemplate(studentName);
    const title = 'Wellbeing Check-In Recommended';

    for (const guardian of guardians) {
      await this.dispatchOne(sessionId, session.studentId, guardian, title, body);
    }

    await this.auditService.log({
      actorId,
      action: 'notify_guardian',
      targetType: 'mha_session',
      targetId: sessionId,
    });

    return { guardiansNotified: guardians.length };
  }

  private async dispatchOne(
    sessionId: string,
    studentId: string,
    guardian: GuardianEntity,
    title: string,
    body: string,
  ): Promise<void> {
    const guardianName = `${guardian.firstName} ${guardian.lastName}`;
    const logRows: Partial<ParentNotificationLogEntity>[] = [];

    try {
      await this.smsService.sendSms(guardian.phone, body);
      logRows.push({ channel: ParentNotificationChannel.SMS, status: ParentNotificationStatus.SENT });
    } catch (error) {
      this.logger.error(`Guardian wellbeing SMS failed: ${error}`);
      logRows.push({
        channel: ParentNotificationChannel.SMS,
        status: ParentNotificationStatus.FAILED,
        failureReason: String(error),
      });
    }

    if (guardian.pushToken) {
      try {
        await this.pushService.sendPush(guardian.pushToken, title, body);
        logRows.push({ channel: ParentNotificationChannel.PUSH, status: ParentNotificationStatus.SENT });
      } catch (error) {
        this.logger.error(`Guardian wellbeing push failed: ${error}`);
        logRows.push({
          channel: ParentNotificationChannel.PUSH,
          status: ParentNotificationStatus.FAILED,
          failureReason: String(error),
        });
      }
    }

    await this.notificationService.createForGuardian(
      guardian.id,
      title,
      body,
      'mha_wellbeing_checkin',
    );

    await this.logRepo.save(
      logRows.map((row) =>
        this.logRepo.create({
          source: 'mha_session',
          sessionId,
          studentId,
          guardianId: guardian.id,
          guardianName,
          ...row,
        }),
      ),
    );
  }

  private assertNoClinicalLanguage(note: string): void {
    const lower = note.toLowerCase();
    for (const term of PARENT_NOTIFICATION_BANNED_TERMS) {
      if (lower.includes(term)) {
        throw new UnprocessableEntityException(
          `Note cannot contain clinical or risk-related language ("${term.trim()}").`,
        );
      }
    }
  }
}
