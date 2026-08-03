import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ParentFeedbackService } from './parent-feedback.service';
import { ParentFeedbackEntity, FeedbackCategory, FeedbackStatus } from './entities/parent-feedback.entity';
import { FeedbackResponseEntity } from './entities/feedback-response.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StaffService } from '../staff/staff.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
  create: jest.fn((d: unknown) => d),
  createQueryBuilder: jest.fn(),
});

function buildQueryBuilder(result: unknown) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

const GUARDIAN_ID = 'guardian-1';
const STUDENT_ID = 'student-1';
const STAFF_ID = 'staff-principal-1';
const FEEDBACK_ID = 'feedback-1';

function buildFeedback(overrides: Partial<ParentFeedbackEntity> = {}): ParentFeedbackEntity {
  return {
    id: FEEDBACK_ID,
    guardianId: GUARDIAN_ID,
    studentId: null,
    subject: 'Canteen food quality',
    body: 'Food has been cold for a week.',
    category: FeedbackCategory.FACILITIES,
    status: FeedbackStatus.RECEIVED,
    referenceNumber: `FB-${new Date().getFullYear()}-0001`,
    submittedAt: new Date(),
    resolvedAt: null,
    ...overrides,
  } as ParentFeedbackEntity;
}

function buildGuardian(overrides: Partial<GuardianEntity> = {}): GuardianEntity {
  return { id: GUARDIAN_ID, firstName: 'Kamal', lastName: 'Silva', phone: '0771234567', pushToken: null, ...overrides } as GuardianEntity;
}

describe('ParentFeedbackService', () => {
  let service: ParentFeedbackService;
  let feedbackRepo: MockRepo<ParentFeedbackEntity>;
  let responseRepo: MockRepo<FeedbackResponseEntity>;
  let studentGuardianRepo: MockRepo<StudentGuardianEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let userRepo: MockRepo<UserEntity>;
  let staffService: { findByEmail: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock; createForGuardian: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  beforeEach(async () => {
    feedbackRepo = repoMock<ParentFeedbackEntity>();
    responseRepo = repoMock<FeedbackResponseEntity>();
    studentGuardianRepo = repoMock<StudentGuardianEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    userRepo = repoMock<UserEntity>();
    staffService = { findByEmail: jest.fn().mockResolvedValue({ id: STAFF_ID }) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = {
      createForStaff: jest.fn().mockResolvedValue(undefined),
      createForGuardian: jest.fn().mockResolvedValue(undefined),
    };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    (feedbackRepo.createQueryBuilder as jest.Mock).mockReturnValue(buildQueryBuilder(null));
    (guardianRepo.findOne as jest.Mock).mockResolvedValue(buildGuardian());
    (userRepo.find as jest.Mock).mockResolvedValue([
      { id: 1, email: 'principal@sims.edu.lk', role: { id: RoleEnum.principal } },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentFeedbackService,
        { provide: getRepositoryToken(ParentFeedbackEntity), useValue: feedbackRepo },
        { provide: getRepositoryToken(FeedbackResponseEntity), useValue: responseRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: studentGuardianRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: StaffService, useValue: staffService },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(ParentFeedbackService);
  });

  describe('create — reference number generation (AI-prompt-requested test)', () => {
    it('generates FB-{year}-0001 for the first submission of the year', async () => {
      (feedbackRepo.createQueryBuilder as jest.Mock).mockReturnValue(buildQueryBuilder(null));

      const feedback = await service.create(
        { subject: 'Canteen food quality', body: 'Cold food.', category: FeedbackCategory.FACILITIES },
        GUARDIAN_ID,
      );

      expect(feedback.referenceNumber).toBe(`FB-${new Date().getFullYear()}-0001`);
    });

    it('increments correctly against an existing max reference number', async () => {
      (feedbackRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        buildQueryBuilder({ referenceNumber: `FB-${new Date().getFullYear()}-0007` }),
      );

      const feedback = await service.create(
        { subject: 'Late bus', body: 'The school bus was late again.', category: FeedbackCategory.OTHER },
        GUARDIAN_ID,
      );

      expect(feedback.referenceNumber).toBe(`FB-${new Date().getFullYear()}-0008`);
    });

    it('never produces a duplicate reference number across successive submissions in the same test run', async () => {
      const seen = new Set<string>();
      let currentMax: string | null = null;
      (feedbackRepo.createQueryBuilder as jest.Mock).mockImplementation(() => buildQueryBuilder(currentMax ? { referenceNumber: currentMax } : null));

      for (let i = 0; i < 5; i++) {
        const feedback = await service.create(
          { subject: `Item ${i}`, body: 'Body', category: FeedbackCategory.OTHER },
          GUARDIAN_ID,
        );
        expect(seen.has(feedback.referenceNumber)).toBe(false);
        seen.add(feedback.referenceNumber);
        currentMax = feedback.referenceNumber;
      }
      expect(seen.size).toBe(5);
    });
  });

  describe('create — Principal notification (AI-prompt-requested test)', () => {
    it('notifies every Principal and acknowledges the guardian with the reference number, without audit-logging', async () => {
      const feedback = await service.create(
        { subject: 'Canteen food quality', body: 'Cold food.', category: FeedbackCategory.FACILITIES },
        GUARDIAN_ID,
      );

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        STAFF_ID,
        'New Parent Feedback',
        expect.stringContaining(feedback.referenceNumber),
        'feedback_submitted',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        GUARDIAN_ID,
        'Feedback Received',
        expect.stringContaining(feedback.referenceNumber),
        'feedback_acknowledged',
      );
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('rejects submitting on behalf of a student the guardian is not linked to', async () => {
      (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          { subject: 'x', body: 'y', category: FeedbackCategory.ACADEMIC, studentId: STUDENT_ID },
          GUARDIAN_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('respond — guardian notification on resolution (AI-prompt-requested test)', () => {
    it('resolves the feedback, sets resolvedAt, and notifies the guardian with the response text', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ status: FeedbackStatus.UNDER_REVIEW }));

      const response = await service.respond(FEEDBACK_ID, { responseBody: 'Fixed, thank you.' }, STAFF_ID);

      expect(response.responseBody).toBe('Fixed, thank you.');
      expect(feedbackRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: FeedbackStatus.RESOLVED, resolvedAt: expect.any(Date) }),
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        GUARDIAN_ID,
        'Your Feedback Has Been Resolved',
        expect.stringContaining('Fixed, thank you.'),
        'feedback_resolved',
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback_respond', targetType: 'parent_feedback', targetId: FEEDBACK_ID }),
      );
    });

    it('is one-shot — rejects responding to an already-resolved item', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ status: FeedbackStatus.RESOLVED }));

      await expect(service.respond(FEEDBACK_ID, { responseBody: 'x' }, STAFF_ID)).rejects.toThrow(ConflictException);
      expect(responseRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown feedback id', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.respond('missing', { responseBody: 'x' }, STAFF_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markUnderReview', () => {
    it('moves a Received item to Under Review and audit-logs the action', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ status: FeedbackStatus.RECEIVED }));

      const result = await service.markUnderReview(FEEDBACK_ID, STAFF_ID);

      expect(result.status).toBe(FeedbackStatus.UNDER_REVIEW);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback_review', targetType: 'parent_feedback' }),
      );
    });

    it('rejects moving an already-resolved item', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ status: FeedbackStatus.RESOLVED }));
      await expect(service.markUnderReview(FEEDBACK_ID, STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('rejects a second call once already Under Review', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ status: FeedbackStatus.UNDER_REVIEW }));
      await expect(service.markUnderReview(FEEDBACK_ID, STAFF_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll — dashboard filtering', () => {
    it('filters by status and category together', async () => {
      await service.findAll({ status: FeedbackStatus.RECEIVED, category: FeedbackCategory.STAFF });
      expect(feedbackRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: FeedbackStatus.RECEIVED, category: FeedbackCategory.STAFF } }),
      );
    });

    it('applies no filter when none is given', async () => {
      await service.findAll({});
      expect(feedbackRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('findMine / getMine', () => {
    it('joins responses onto the calling guardian own submissions', async () => {
      (feedbackRepo.find as jest.Mock).mockResolvedValue([buildFeedback({ status: FeedbackStatus.RESOLVED })]);
      (responseRepo.find as jest.Mock).mockResolvedValue([
        { id: 'resp-1', parentFeedbackId: FEEDBACK_ID, respondedById: STAFF_ID, responseBody: 'Done', respondedAt: new Date() },
      ]);

      const rows = await service.findMine(GUARDIAN_ID);

      expect(rows).toHaveLength(1);
      expect(rows[0].response).toEqual(expect.objectContaining({ responseBody: 'Done' }));
    });

    it('rejects viewing a feedback item that belongs to a different guardian', async () => {
      (feedbackRepo.findOne as jest.Mock).mockResolvedValue(buildFeedback({ guardianId: 'someone-else' }));
      await expect(service.getMine(FEEDBACK_ID, GUARDIAN_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});
