import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ParentFeedbackEntity, FeedbackStatus } from './entities/parent-feedback.entity';
import { FeedbackResponseEntity } from './entities/feedback-response.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StaffService } from '../staff/staff.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RespondToFeedbackDto } from './dto/respond-to-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

export interface MyFeedbackRow {
  feedback: ParentFeedbackEntity;
  response: FeedbackResponseEntity | null;
}

@Injectable()
export class ParentFeedbackService {
  constructor(
    @InjectRepository(ParentFeedbackEntity)
    private readonly feedbackRepo: Repository<ParentFeedbackEntity>,

    @InjectRepository(FeedbackResponseEntity)
    private readonly responseRepo: Repository<FeedbackResponseEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly staffService: StaffService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  /** FR-P5-PP-14. Mirrors `StudentsService.generateAdmissionNumber()`'s exact shape — year-prefixed,
   * highest-existing-value lookup, zero-padded increment — backed by a DB unique constraint as a
   * safety net the original precedent doesn't have. */
  private async generateReferenceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FB-${year}-`;

    const last = await this.feedbackRepo
      .createQueryBuilder('f')
      .where('f.referenceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('f.referenceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (last) {
      const lastSeq = parseInt(last.referenceNumber.slice(prefix.length), 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /** FR-P5-PP-12/13/14. Guardian self-service — deliberately NOT audit-logged, matching
   * `EventRegistrationService`'s own established line between routine self-service and
   * staff-initiated lifecycle transitions. */
  async create(dto: CreateFeedbackDto, guardianId: string): Promise<ParentFeedbackEntity> {
    if (dto.studentId) {
      const link = await this.studentGuardianRepo.findOne({
        where: { studentId: dto.studentId, guardianId },
      });
      if (!link) {
        throw new ForbiddenException('You are not authorized to submit feedback on behalf of this student.');
      }
    }

    const referenceNumber = await this.generateReferenceNumber();
    const feedback = await this.feedbackRepo.save(
      this.feedbackRepo.create({
        guardianId,
        studentId: dto.studentId ?? null,
        subject: dto.subject,
        body: dto.body,
        category: dto.category,
        referenceNumber,
        submittedAt: new Date(),
      }),
    );

    await this.notifyPrincipals(feedback);
    await this.acknowledgeGuardian(feedback);

    return feedback;
  }

  async findAll(filters: QueryFeedbackDto): Promise<ParentFeedbackEntity[]> {
    return this.feedbackRepo.find({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      },
      order: { submittedAt: 'DESC' },
    });
  }

  async findMine(guardianId: string): Promise<MyFeedbackRow[]> {
    const items = await this.feedbackRepo.find({ where: { guardianId }, order: { submittedAt: 'DESC' } });
    if (items.length === 0) return [];

    const responses = await this.responseRepo.find({
      where: { parentFeedbackId: In(items.map((i) => i.id)) },
    });
    const responseByFeedbackId = new Map(responses.map((r) => [r.parentFeedbackId, r]));

    return items.map((feedback) => ({
      feedback,
      response: responseByFeedbackId.get(feedback.id) ?? null,
    }));
  }

  private async getOwnedOrThrow(id: string, guardianId: string): Promise<ParentFeedbackEntity> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found.`);
    }
    if (feedback.guardianId !== guardianId) {
      throw new ForbiddenException('You are not authorized to view this feedback.');
    }
    return feedback;
  }

  async getMine(id: string, guardianId: string): Promise<MyFeedbackRow> {
    const feedback = await this.getOwnedOrThrow(id, guardianId);
    const response = await this.responseRepo.findOne({ where: { parentFeedbackId: feedback.id } });
    return { feedback, response };
  }

  async markUnderReview(id: string, actorStaffId: string): Promise<ParentFeedbackEntity> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found.`);
    }
    if (feedback.status !== FeedbackStatus.RECEIVED) {
      throw new ConflictException(`This feedback is already ${feedback.status.replace('_', ' ')}.`);
    }

    feedback.status = FeedbackStatus.UNDER_REVIEW;
    await this.feedbackRepo.save(feedback);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'feedback_review',
      targetType: 'parent_feedback',
      targetId: feedback.id,
    });

    return feedback;
  }

  /** FR-P5-PP-15/16. One-shot — a second response attempt 409s, so at most one
   * `FeedbackResponseEntity` row ever exists per feedback item. */
  async respond(id: string, dto: RespondToFeedbackDto, actorStaffId: string): Promise<FeedbackResponseEntity> {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) {
      throw new NotFoundException(`Feedback ${id} not found.`);
    }
    if (feedback.status === FeedbackStatus.RESOLVED) {
      throw new ConflictException('This feedback has already been resolved.');
    }

    const response = await this.responseRepo.save(
      this.responseRepo.create({
        parentFeedbackId: feedback.id,
        respondedById: actorStaffId,
        responseBody: dto.responseBody,
        respondedAt: new Date(),
      }),
    );

    feedback.status = FeedbackStatus.RESOLVED;
    feedback.resolvedAt = new Date();
    await this.feedbackRepo.save(feedback);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'feedback_respond',
      targetType: 'parent_feedback',
      targetId: feedback.id,
    });

    await this.notifyResolution(feedback, response);

    return response;
  }

  private async notifyPrincipals(feedback: ParentFeedbackEntity): Promise<void> {
    const title = 'New Parent Feedback';
    const message = `${feedback.referenceNumber} — "${feedback.subject}" (${feedback.category}) has been submitted.`;

    const principals = await this.userRepo.find({
      where: { role: { id: RoleEnum.principal } },
      relations: ['role'],
    });
    for (const user of principals) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (!staff) continue;
      await this.notificationService
        .createForStaff(staff.id, title, message, 'feedback_submitted')
        .catch(() => undefined);
    }
  }

  private async acknowledgeGuardian(feedback: ParentFeedbackEntity): Promise<void> {
    const guardian = await this.guardianRepo.findOne({ where: { id: feedback.guardianId } });
    if (!guardian) return;

    const title = 'Feedback Received';
    const message = `Thank you — we've received your feedback "${feedback.subject}". Your reference number is ${feedback.referenceNumber}.`;

    await Promise.allSettled([
      this.notificationService.createForGuardian(guardian.id, title, message, 'feedback_acknowledged'),
      this.smsService.sendSms(guardian.phone, message),
      guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, message) : Promise.resolve(),
    ]);
  }

  private async notifyResolution(feedback: ParentFeedbackEntity, response: FeedbackResponseEntity): Promise<void> {
    const guardian = await this.guardianRepo.findOne({ where: { id: feedback.guardianId } });
    if (!guardian) return;

    const title = 'Your Feedback Has Been Resolved';
    const message = `${feedback.referenceNumber} — "${feedback.subject}": ${response.responseBody}`;

    await Promise.allSettled([
      this.notificationService.createForGuardian(guardian.id, title, message, 'feedback_resolved'),
      this.smsService.sendSms(guardian.phone, message),
      guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, message) : Promise.resolve(),
    ]);
  }
}
