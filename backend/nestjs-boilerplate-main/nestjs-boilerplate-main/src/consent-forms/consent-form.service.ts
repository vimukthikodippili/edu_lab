import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { ConsentFormEntity, ConsentTargetType } from './entities/consent-form.entity';
import { ConsentResponseEntity, ConsentResponseType } from './entities/consent-response.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { CreateConsentFormDto } from './dto/create-consent-form.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

export interface TargetPair {
  student: StudentEntity;
  guardians: GuardianEntity[];
}

export type ConsentDashboardStatus = 'signed' | 'declined' | 'pending';

export interface ConsentDashboardRow {
  student: StudentEntity;
  status: ConsentDashboardStatus;
  response: ConsentResponseEntity | null;
}

@Injectable()
export class ConsentFormService {
  constructor(
    @InjectRepository(ConsentFormEntity)
    private readonly formRepo: Repository<ConsentFormEntity>,

    @InjectRepository(ConsentResponseEntity)
    private readonly responseRepo: Repository<ConsentResponseEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  /** FR-P5-PP-18. Mirrors `TargetedMessageService.resolveParents()`'s three-way branch, but
   * returns `(student, guardians[])` pairs instead of a deduped flat guardian list, since the
   * consent dashboard needs per-student rows. Resolved live off the form's target columns, not
   * snapshotted at creation. */
  async resolveTargetPairs(form: ConsentFormEntity): Promise<TargetPair[]> {
    let students: StudentEntity[];

    if (form.targetType === ConsentTargetType.ALL_PARENTS) {
      students = await this.studentRepo.find({
        relations: ['studentGuardians', 'studentGuardians.guardian'],
      });
    } else if (form.targetType === ConsentTargetType.SPECIFIC_GRADES) {
      const gradeIds = form.targetGrades ?? [];
      students =
        gradeIds.length === 0
          ? []
          : await this.studentRepo.find({
              where: { gradeId: In(gradeIds) },
              relations: ['studentGuardians', 'studentGuardians.guardian'],
            });
    } else {
      const studentIds = form.targetStudentIds ?? [];
      students =
        studentIds.length === 0
          ? []
          : await this.studentRepo.find({
              where: { id: In(studentIds) },
              relations: ['studentGuardians', 'studentGuardians.guardian'],
            });
    }

    return students.map((student) => ({
      student,
      guardians: student.guardians.filter((g) => !g.isBlacklisted),
    }));
  }

  async create(dto: CreateConsentFormDto, actorStaffId: string): Promise<ConsentFormEntity> {
    const form = await this.formRepo.save(
      this.formRepo.create({
        title: dto.title,
        description: dto.description,
        targetType: dto.targetType,
        targetGrades: dto.targetGrades ?? null,
        targetStudentIds: dto.targetStudentIds ?? null,
        deadline: dto.deadline,
        createdByStaffId: actorStaffId,
      }),
    );

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'create_consent',
      targetType: 'consent_form',
      targetId: form.id,
    });

    const pairs = await this.resolveTargetPairs(form);
    await this.notifyTargets(form, pairs);

    return form;
  }

  async findAll(): Promise<ConsentFormEntity[]> {
    return this.formRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getById(id: string): Promise<ConsentFormEntity> {
    const form = await this.formRepo.findOne({ where: { id } });
    if (!form) throw new NotFoundException(`Consent form ${id} not found.`);
    return form;
  }

  async getDashboard(formId: string): Promise<ConsentDashboardRow[]> {
    const form = await this.getById(formId);
    const pairs = await this.resolveTargetPairs(form);
    if (pairs.length === 0) return [];

    const responses = await this.responseRepo.find({
      where: { consentFormId: form.id, studentId: In(pairs.map((p) => p.student.id)) },
    });
    const responseByStudentId = new Map(responses.map((r) => [r.studentId, r]));

    return pairs.map(({ student }) => {
      const response = responseByStudentId.get(student.id) ?? null;
      const status: ConsentDashboardStatus = !response
        ? 'pending'
        : response.response === ConsentResponseType.SIGNED
          ? 'signed'
          : 'declined';
      return { student, status, response };
    });
  }

  /** FR-P5-PP-21. Admin-initiated "remind all pending" — audited, unlike routine guardian
   * self-service. Only notifies students with no response yet. */
  async remindPending(formId: string, actorStaffId: string): Promise<number> {
    const form = await this.getById(formId);
    const pairs = await this.resolveTargetPairs(form);
    const pending = await this.filterPending(form, pairs);

    await this.notifyTargets(form, pending, true);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'remind_consent',
      targetType: 'consent_form',
      targetId: form.id,
    });

    return pending.length;
  }

  /** FR-P5-PP-19. Re-fires every day a student stays pending, by design — no "already reminded"
   * dedupe flag; `@Cron`'s single-execution-per-tick guarantee is sufficient. Only processes forms
   * whose deadline hasn't passed yet. */
  @Cron('0 7 * * *')
  async sendDailyReminders(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const stillOpen = await this.formRepo.find({ where: { deadline: MoreThanOrEqual(today) } });

    for (const form of stillOpen) {
      const pairs = await this.resolveTargetPairs(form);
      const pending = await this.filterPending(form, pairs);
      await this.notifyTargets(form, pending, true);
    }
  }

  private async filterPending(form: ConsentFormEntity, pairs: TargetPair[]): Promise<TargetPair[]> {
    if (pairs.length === 0) return [];
    const responses = await this.responseRepo.find({
      where: { consentFormId: form.id, studentId: In(pairs.map((p) => p.student.id)) },
    });
    const respondedStudentIds = new Set(responses.map((r) => r.studentId));
    return pairs.filter((p) => !respondedStudentIds.has(p.student.id));
  }

  private async notifyTargets(
    form: ConsentFormEntity,
    pairs: TargetPair[],
    isReminder = false,
  ): Promise<void> {
    const title = isReminder ? `Reminder: ${form.title}` : `New Consent Form: ${form.title}`;
    const message = isReminder
      ? `Please sign or decline "${form.title}" before ${form.deadline}.`
      : `A new consent form "${form.title}" needs your response before ${form.deadline}.`;

    const guardianMap = new Map<string, GuardianEntity>();
    for (const pair of pairs) {
      for (const guardian of pair.guardians) {
        guardianMap.set(guardian.id, guardian);
      }
    }

    const notifyType = isReminder ? 'consent_reminder' : 'consent_created';
    await Promise.allSettled(
      [...guardianMap.values()].map((guardian) =>
        Promise.allSettled([
          this.notificationService.createForGuardian(guardian.id, title, message, notifyType),
          this.smsService.sendSms(guardian.phone, message),
          guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, message) : Promise.resolve(),
        ]),
      ),
    );
  }
}
