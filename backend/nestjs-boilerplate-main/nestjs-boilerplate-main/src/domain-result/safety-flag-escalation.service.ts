import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StaffService } from '../staff/staff.service';
import { RoleEnum } from '../roles/roles.enum';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { CounselorCaseService } from '../counselor/counselor-case.service';
import { CRISIS_RESOURCES, CrisisResource } from './config/crisis-resources.config';
import { SafetyNotificationQueueService } from '../safety-notification/safety-notification-queue.service';
import { DeliveryChannel } from '../safety-notification/entities/notification-delivery-log.entity';

export interface EscalateParams {
  counselorStaffId: string;
  studentId: string;
  sessionId: string;
  caseNumber: string;
}

/** MHA-122/133 — FR-MHA-14/15/16/18, NFR-MHA-02. Fires push+SMS to the session's counselor and
 * every Principal, and upserts the linked CounselorCase. Deliberately does not use
 * NotificationService (in-app) — AC #2 only asks for push+SMS. Message content stays non-clinical
 * (mirrors CounselorCaseService's FORBIDDEN_CLINICAL_TERMS precedent) since a push notification
 * can appear on a lock screen. Callers must await escalate() BEFORE persisting the triggering
 * save — see DomainResultService.update() for the ordering contract this depends on (FR-MHA-16).
 * MHA-133 — dispatch now goes through SafetyNotificationQueueService (retry-with-backoff +
 * persisted delivery log), but escalate() itself only awaits log-row creation + attempt #1 per
 * recipient/channel — retries continue in the background, so this ordering contract's latency is
 * unchanged from MHA-122. */
@Injectable()
export class SafetyFlagEscalationService {
  private readonly logger = new Logger(SafetyFlagEscalationService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly staffService: StaffService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly counselorCaseService: CounselorCaseService,
    private readonly queueService: SafetyNotificationQueueService,
  ) {}

  /** Resolves the session's assigned counselor + every Principal, deduped by staffId, so a
   * principal who happens to also be the session counselor is only notified once. */
  private async resolveEscalationRecipients(counselorStaffId: string): Promise<StaffEntity[]> {
    const recipients = new Map<string, StaffEntity>();

    const counselor = await this.staffService.findById(counselorStaffId);
    recipients.set(counselor.id, counselor);

    const principalUsers = await this.userRepo.find({
      where: { role: { id: RoleEnum.principal } },
      relations: ['role'],
    });
    for (const user of principalUsers) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (staff) recipients.set(staff.id, staff);
    }

    return Array.from(recipients.values());
  }

  async escalate(params: EscalateParams): Promise<CrisisResource[]> {
    const { counselorStaffId, studentId, sessionId, caseNumber } = params;
    const recipients = await this.resolveEscalationRecipients(counselorStaffId);

    const title = 'URGENT: MHA Safety Flag Raised';
    const body = `A safety flag was raised in MHA session ${caseNumber}. Please review immediately.`;
    const alertId = randomUUID();

    // MHA-133 — each (recipient, channel) delivery is tracked + retried independently through
    // the dedicated queue. Only attempt #1 is awaited here; retries continue in the background.
    const dispatchTasks: Promise<unknown>[] = [];
    for (const staff of recipients) {
      dispatchTasks.push(
        this.queueService.createLogAndDispatch(
          { alertId, sessionId, studentId, recipientStaffId: staff.id, channel: DeliveryChannel.SMS },
          () => this.smsService.sendSms(staff.phone, body),
        ),
      );
      if (staff.pushToken) {
        const pushToken = staff.pushToken;
        dispatchTasks.push(
          this.queueService.createLogAndDispatch(
            { alertId, sessionId, studentId, recipientStaffId: staff.id, channel: DeliveryChannel.PUSH },
            () => this.pushService.sendPush(pushToken, title, body),
          ),
        );
      }
    }

    const results = await Promise.allSettled(dispatchTasks);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(`Safety flag notification dispatch setup failed: ${result.reason}`);
      }
    });

    await this.counselorCaseService.upsertSafetyFlagCase(
      studentId,
      `Safety flag raised in MHA session ${caseNumber}`,
    );

    return CRISIS_RESOURCES;
  }
}
