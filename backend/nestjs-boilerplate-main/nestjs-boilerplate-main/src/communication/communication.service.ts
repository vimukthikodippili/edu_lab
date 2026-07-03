import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { EmergencyAlertEntity } from './entities/emergency-alert.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { MailerService } from '../mailer/mailer.service';

export interface AlertChannelResult {
  recipientType: 'guardian' | 'staff';
  recipientId: string;
  recipientName: string;
  channel: 'sms' | 'push' | 'email';
  status: 'sent' | 'failed';
  failureReason?: string;
}

export interface SendAlertSummary {
  alertId: string;
  sentAt: Date;
  totalRecipients: number;
  totalChannels: number;
  sentCount: number;
  failedCount: number;
  results: AlertChannelResult[];
}

interface AlertTask {
  recipient: { type: 'guardian' | 'staff'; id: string; name: string };
  channel: 'sms' | 'push' | 'email';
  fn: () => Promise<void>;
}

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(EmergencyAlertEntity)
    private readonly alertRepo: Repository<EmergencyAlertEntity>,

    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async sendEmergencyAlert(
    message: string,
    sentByStaffId: string,
  ): Promise<SendAlertSummary> {
    // Step 1: Persist the alert record first so we have an ID for the logs
    const alert = await this.alertRepo.save(
      this.alertRepo.create({ message, sentByStaffId }),
    );

    // Step 2: Load deduplicated, non-blacklisted guardians via student_guardian junction
    const sgRows = await this.studentGuardianRepo.find({
      relations: ['guardian'],
    });
    const guardianMap = new Map<string, GuardianEntity>();
    for (const sg of sgRows) {
      if (!sg.guardian.isBlacklisted) {
        guardianMap.set(sg.guardian.id, sg.guardian);
      }
    }
    const guardians = [...guardianMap.values()];

    // Step 3: Load all active staff
    const staffList = await this.staffRepo.find({
      where: { status: StaffStatus.ACTIVE },
    });

    // Step 4: Build task list — one entry per recipient per channel
    const tasks: AlertTask[] = [];

    for (const g of guardians) {
      const name = `${g.firstName} ${g.lastName}`;
      const rcp = { type: 'guardian' as const, id: g.id, name };

      tasks.push({
        recipient: rcp,
        channel: 'sms',
        fn: () => this.smsService.sendSms(g.phone, message),
      });

      tasks.push({
        recipient: rcp,
        channel: 'push',
        fn: () =>
          this.pushService.sendPush(g.pushToken, 'Emergency Alert', message),
      });

      if (g.email) {
        const email = g.email;
        tasks.push({
          recipient: rcp,
          channel: 'email',
          fn: () => this.sendEmergencyEmail(email, name, message),
        });
      } else {
        tasks.push({
          recipient: rcp,
          channel: 'email',
          fn: () => Promise.reject(new Error('no email address')),
        });
      }
    }

    for (const s of staffList) {
      const name = `${s.firstName} ${s.lastName}`;
      const rcp = { type: 'staff' as const, id: s.id, name };

      tasks.push({
        recipient: rcp,
        channel: 'sms',
        fn: () => this.smsService.sendSms(s.phone, message),
      });

      if (s.pushToken) {
        const token = s.pushToken;
        tasks.push({
          recipient: rcp,
          channel: 'push',
          fn: () => this.pushService.sendPush(token, 'Emergency Alert', message),
        });
      } else {
        tasks.push({
          recipient: rcp,
          channel: 'push',
          fn: () => Promise.reject(new Error('no push token')),
        });
      }

      tasks.push({
        recipient: rcp,
        channel: 'email',
        fn: () => this.sendEmergencyEmail(s.email, name, message),
      });
    }

    // Step 5: Fan out to all channels in parallel — a single channel failure never blocks others
    const settled = await Promise.allSettled(tasks.map((t) => t.fn()));

    // Step 6: Batch-persist all log rows in one save
    const logEntities = settled.map((result, i) => {
      const task = tasks[i];
      const status = result.status === 'fulfilled' ? 'sent' : 'failed';
      const failureReason =
        result.status === 'rejected'
          ? ((result.reason as Error).message ?? 'unknown error')
          : null;

      return this.logRepo.create({
        alertId: alert.id,
        recipientType: task.recipient.type,
        recipientId: task.recipient.id,
        recipientName: task.recipient.name,
        channel: task.channel,
        status,
        failureReason,
      });
    });

    await this.logRepo.save(logEntities);

    // Step 7: Build and return summary
    const sentCount = settled.filter((r) => r.status === 'fulfilled').length;
    const results: AlertChannelResult[] = logEntities.map((l) => ({
      recipientType: l.recipientType,
      recipientId: l.recipientId,
      recipientName: l.recipientName,
      channel: l.channel,
      status: l.status,
      ...(l.failureReason ? { failureReason: l.failureReason } : {}),
    }));

    return {
      alertId: alert.id,
      sentAt: alert.sentAt,
      totalRecipients: guardians.length + staffList.length,
      totalChannels: tasks.length,
      sentCount,
      failedCount: tasks.length - sentCount,
      results,
    };
  }

  async getAlertLogs(alertId: string): Promise<NotificationLogEntity[]> {
    return this.logRepo.find({
      where: { alertId },
      order: { createdAt: 'ASC' },
    });
  }

  private async sendEmergencyEmail(
    to: string,
    recipientName: string,
    message: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'URGENT: School Emergency Alert',
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', { infer: true }),
        'src',
        'mail',
        'mail-templates',
        'emergency-alert.hbs',
      ),
      context: {
        recipientName,
        message,
        app_name: this.configService.get('app.name', { infer: true }),
      },
    });
  }
}
