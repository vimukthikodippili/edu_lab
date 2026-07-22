import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { TargetedMessageEntity } from './entities/targeted-message.entity';
import {
  TargetedDeliveryStatus,
  TargetedMessageChannel,
  TargetedMessageRecipientEntity,
  TargetedRecipientType,
} from './entities/targeted-message-recipient.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { StaffFunctionalRole } from '../staff/entities/staff-role-assignment.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { MailerService } from '../mailer/mailer.service';
import { RecipientCriteriaDto } from './dto/recipient-criteria.dto';
import { SendTargetedMessageDto } from './dto/send-targeted-message.dto';

export interface ResolvedRecipient {
  type: TargetedRecipientType;
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  pushToken: string | null;
}

export interface RecipientPreview {
  parentCount: number;
  teacherCount: number;
  total: number;
}

export interface TargetedMessageHistoryRow {
  id: string;
  sentByStaffId: string;
  sentByStaff: StaffEntity;
  subject: string;
  body: string;
  channelSms: boolean;
  channelEmail: boolean;
  channelPush: boolean;
  recipientCount: number;
  sentAt: Date;
  sentCount: number;
  failedCount: number;
}

interface DispatchTask {
  recipient: ResolvedRecipient;
  channel: TargetedMessageChannel;
  fn: () => Promise<void>;
}

/** Principal composes one message and targets exactly which parents/teachers receive it — by
 * grade, class section, individual selection, or "all". Mirrors CommunicationService's
 * sendEmergencyAlert() dispatch shape (build a flat recipient×channel task list, Promise.allSettled
 * across the same three channel services, batch-save one log row per task) — the one thing that
 * differs is resolveRecipients() actually filtering instead of always resolving everyone. */
@Injectable()
export class TargetedMessageService {
  constructor(
    @InjectRepository(TargetedMessageEntity)
    private readonly messageRepo: Repository<TargetedMessageEntity>,

    @InjectRepository(TargetedMessageRecipientEntity)
    private readonly messageRecipientRepo: Repository<TargetedMessageRecipientEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableEntryRepo: Repository<TimetableEntryEntity>,

    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async resolveRecipients(criteria: RecipientCriteriaDto): Promise<ResolvedRecipient[]> {
    const parents = await this.resolveParents(criteria);
    const teachers = await this.resolveTeachers(criteria);
    return [...parents, ...teachers];
  }

  async previewRecipients(criteria: RecipientCriteriaDto): Promise<RecipientPreview> {
    const recipients = await this.resolveRecipients(criteria);
    const parentCount = recipients.filter((r) => r.type === 'parent').length;
    const teacherCount = recipients.filter((r) => r.type === 'teacher').length;
    return { parentCount, teacherCount, total: recipients.length };
  }

  async send(dto: SendTargetedMessageDto, sentByStaffId: string): Promise<TargetedMessageEntity> {
    const recipients = await this.resolveRecipients(dto);

    const message = await this.messageRepo.save(
      this.messageRepo.create({
        sentByStaffId,
        subject: dto.subject,
        body: dto.body,
        channelSms: dto.channelSms,
        channelEmail: dto.channelEmail,
        channelPush: dto.channelPush,
        recipientCount: recipients.length,
      }),
    );

    const tasks: DispatchTask[] = [];

    for (const r of recipients) {
      if (dto.channelSms) {
        tasks.push({
          recipient: r,
          channel: 'sms',
          fn: r.phone
            ? () => this.smsService.sendSms(r.phone as string, `${dto.subject}: ${dto.body}`)
            : () => Promise.reject(new Error('no phone number')),
        });
      }
      if (dto.channelEmail) {
        tasks.push({
          recipient: r,
          channel: 'email',
          fn: r.email
            ? () => this.sendTargetedEmail(r.email as string, r.name, dto.subject, dto.body)
            : () => Promise.reject(new Error('no email address')),
        });
      }
      if (dto.channelPush) {
        tasks.push({
          recipient: r,
          channel: 'push',
          fn: r.pushToken
            ? () => this.pushService.sendPush(r.pushToken as string, dto.subject, dto.body)
            : () => Promise.reject(new Error('no push token')),
        });
      }
    }

    const settled = await Promise.allSettled(tasks.map((t) => t.fn()));

    const recipientEntities = settled.map((result, i) => {
      const task = tasks[i];
      const status: TargetedDeliveryStatus = result.status === 'fulfilled' ? 'sent' : 'failed';
      const failureReason =
        result.status === 'rejected' ? ((result.reason as Error).message ?? 'unknown error') : null;

      return this.messageRecipientRepo.create({
        targetedMessageId: message.id,
        recipientType: task.recipient.type,
        recipientId: task.recipient.id,
        recipientName: task.recipient.name,
        channel: task.channel,
        deliveryStatus: status,
        deliveredAt: status === 'sent' ? new Date() : null,
        failureReason,
      });
    });

    await this.messageRecipientRepo.save(recipientEntities);

    return message;
  }

  async getHistory(): Promise<TargetedMessageHistoryRow[]> {
    const messages = await this.messageRepo.find({ order: { sentAt: 'DESC' } });
    const rows: TargetedMessageHistoryRow[] = [];
    for (const m of messages) {
      const [sentCount, failedCount] = await Promise.all([
        this.messageRecipientRepo.count({ where: { targetedMessageId: m.id, deliveryStatus: 'sent' } }),
        this.messageRecipientRepo.count({ where: { targetedMessageId: m.id, deliveryStatus: 'failed' } }),
      ]);
      rows.push({ ...m, sentCount, failedCount });
    }
    return rows;
  }

  async getMessageDetail(
    id: string,
  ): Promise<{ message: TargetedMessageEntity; recipients: TargetedMessageRecipientEntity[] }> {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Targeted message ${id} not found.`);
    const recipients = await this.messageRecipientRepo.find({
      where: { targetedMessageId: id },
      order: { recipientName: 'ASC' },
    });
    return { message, recipients };
  }

  // ─── Recipient resolution ───────────────────────────────────────────────

  private async resolveParents(criteria: RecipientCriteriaDto): Promise<ResolvedRecipient[]> {
    const guardianMap = new Map<string, GuardianEntity>();

    if (criteria.allParents) {
      const sgRows = await this.studentGuardianRepo.find({ relations: ['guardian'] });
      for (const sg of sgRows) {
        if (!sg.guardian.isBlacklisted) guardianMap.set(sg.guardian.id, sg.guardian);
      }
    } else {
      const gradeIds = criteria.gradeIds ?? [];
      const classSectionIds = criteria.classSectionIds ?? [];

      if (gradeIds.length > 0 || classSectionIds.length > 0) {
        const where: Record<string, unknown>[] = [];
        if (gradeIds.length > 0) where.push({ gradeId: In(gradeIds) });
        if (classSectionIds.length > 0) where.push({ classSectionId: In(classSectionIds) });

        const students = await this.studentRepo.find({
          where,
          relations: ['studentGuardians', 'studentGuardians.guardian'],
        });

        for (const student of students) {
          for (const guardian of student.guardians) {
            if (!guardian.isBlacklisted) guardianMap.set(guardian.id, guardian);
          }
        }
      }

      if (criteria.guardianIds && criteria.guardianIds.length > 0) {
        const rows = await this.guardianRepo.find({ where: { id: In(criteria.guardianIds) } });
        for (const g of rows) {
          if (!g.isBlacklisted) guardianMap.set(g.id, g);
        }
      }
    }

    return [...guardianMap.values()].map((g) => ({
      type: 'parent' as const,
      id: g.id,
      name: `${g.firstName} ${g.lastName}`,
      phone: g.phone,
      email: g.email,
      pushToken: g.pushToken,
    }));
  }

  private async resolveTeachers(criteria: RecipientCriteriaDto): Promise<ResolvedRecipient[]> {
    const staffMap = new Map<string, StaffEntity>();

    if (criteria.allTeachers) {
      const staffList = await this.staffRepo.find({ where: { status: StaffStatus.ACTIVE } });
      for (const s of staffList) {
        if (this.isTeacher(s)) staffMap.set(s.id, s);
      }
    } else {
      const gradeIds = criteria.gradeIds ?? [];
      let classSectionIds = criteria.classSectionIds ?? [];

      if (gradeIds.length > 0) {
        const sections = await this.classSectionRepo.find({ where: { gradeId: In(gradeIds) } });
        classSectionIds = [...classSectionIds, ...sections.map((s) => s.id)];
      }

      if (classSectionIds.length > 0) {
        const rows = await this.timetableEntryRepo
          .createQueryBuilder('e')
          .select('DISTINCT e.teacherId', 'teacherId')
          .where('e.classSectionId IN (:...ids)', { ids: classSectionIds })
          .getRawMany<{ teacherId: string }>();

        const teacherIds = rows.map((r) => r.teacherId);
        if (teacherIds.length > 0) {
          const staffList = await this.staffRepo.find({ where: { id: In(teacherIds) } });
          for (const s of staffList) staffMap.set(s.id, s);
        }
      }

      if (criteria.staffIds && criteria.staffIds.length > 0) {
        const staffList = await this.staffRepo.find({ where: { id: In(criteria.staffIds) } });
        for (const s of staffList) staffMap.set(s.id, s);
      }
    }

    return [...staffMap.values()].map((s) => ({
      type: 'teacher' as const,
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      phone: s.phone,
      email: s.email,
      pushToken: s.pushToken,
    }));
  }

  private isTeacher(staff: StaffEntity): boolean {
    return (
      staff.roleAssignments?.some(
        (r) =>
          r.role === StaffFunctionalRole.SUBJECT_TEACHER || r.role === StaffFunctionalRole.CLASS_TEACHER,
      ) ?? false
    );
  }

  private async sendTargetedEmail(
    to: string,
    recipientName: string,
    subject: string,
    body: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', { infer: true }),
        'src',
        'mail',
        'mail-templates',
        'targeted-message.hbs',
      ),
      context: {
        recipientName,
        subject,
        body,
        app_name: this.configService.get('app.name', { infer: true }),
      },
    });
  }
}
