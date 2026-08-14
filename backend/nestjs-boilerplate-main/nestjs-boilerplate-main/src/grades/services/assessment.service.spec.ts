import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssessmentService } from './assessment.service';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { QuestionType } from '../entities/assessment-topic-allocation.entity';
import { SubjectTopicsService } from '../../subject-topics/subject-topics.service';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { NotificationService } from '../../notification/notification.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const SUBJECT_ID = 'subj-uuid';
const TOPIC_ID = 'topic-uuid';

const makePlan = (requiredAssessmentCount = 3): TermAssessmentPlanEntity =>
  ({
    id: 1,
    subjectId: SUBJECT_ID,
    termId: 1,
    requiredAssessmentCount,
    setBySectionHeadId: 'head-uuid',
  } as TermAssessmentPlanEntity);

const makeDto = (overrides: Partial<CreateAssessmentDto> = {}): CreateAssessmentDto => ({
  subjectId: SUBJECT_ID,
  termId: 1,
  classSectionId: 1,
  title: 'Monthly Test 1',
  assessmentType: AssessmentType.MONTHLY_TEST,
  scheduledDate: '2026-06-15',
  topicAllocations: [{ subjectTopicId: TOPIC_ID, maxMarks: 100, questionType: QuestionType.STRUCTURED }],
  sectionHeadOverride: false,
  ...overrides,
});

const makeTopic = (overrides: Record<string, unknown> = {}) => ({
  id: TOPIC_ID,
  subjectId: SUBJECT_ID,
  title: 'Algebra',
  isArchived: false,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AssessmentService', () => {
  let service: AssessmentService;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let planRepo: MockRepo<TermAssessmentPlanEntity>;
  let allocationRepo: MockRepo<AssessmentTopicAllocationEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let subjectRepo: MockRepo<SubjectEntity>;
  let subjectTopicsService: { findById: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    assessmentRepo = repoMock<AssessmentEntity>();
    planRepo = repoMock<TermAssessmentPlanEntity>();
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    staffRepo = repoMock<StaffEntity>();
    subjectRepo = repoMock<SubjectEntity>();
    subjectTopicsService = { findById: jest.fn().mockResolvedValue(makeTopic()) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          getRepository: (entity: unknown) =>
            entity === AssessmentEntity ? assessmentRepo : allocationRepo,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentService,
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(TermAssessmentPlanEntity), useValue: planRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: SubjectTopicsService, useValue: subjectTopicsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AssessmentService>(AssessmentService);
    jest.clearAllMocks();
    allocationRepo.find!.mockResolvedValue([]);
    allocationRepo.save!.mockImplementation((data) =>
      Promise.resolve(Array.isArray(data) ? data.map((d, i) => ({ id: `alloc-${i}`, ...d })) : data),
    );
    subjectTopicsService.findById.mockResolvedValue(makeTopic());
    requirementRepo.findOne!.mockResolvedValue(null);
    subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID, name: 'Mathematics' });
    notificationService.createForStaff.mockResolvedValue(undefined);
  });

  describe('create — assessment plan / limit checks', () => {
    it('throws NotFoundException when no plan is configured', async () => {
      planRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when count equals limit and override is false', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);

      await expect(
        service.create(makeDto({ sectionHeadOverride: false }), 'teacher-uuid'),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('saves assessment when SectionHead override is true even at limit', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(3);
      assessmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'new-uuid' }));

      const result = await service.create(
        makeDto({ sectionHeadOverride: true }),
        'section-head-uuid',
      );

      expect(assessmentRepo.save).toHaveBeenCalledTimes(1);
      const saved = (assessmentRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.sectionHeadOverride).toBe(true);
      expect(saved.overrideApprovedById).toBe('section-head-uuid');
      expect(result).toBeDefined();
    });
  });

  describe('create — topic allocation (the total is always the sum, never independently set)', () => {
    beforeEach(() => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(0);
      assessmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assessment-1' }));
    });

    it('computes totalMarks as the sum of the topic allocations', async () => {
      const result = await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 20, questionType: QuestionType.MCQ },
            { subjectTopicId: 'topic-2', maxMarks: 15, questionType: QuestionType.STRUCTURED },
            { subjectTopicId: 'topic-3', maxMarks: 15, questionType: QuestionType.ESSAY },
          ],
        }),
        'teacher-uuid',
      );

      expect(assessmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalMarks: 50 }),
      );
      expect(result.totalMarks).toBe(50);
    });

    it('persists the questionType given for each topic allocation', async () => {
      const result = await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 20, questionType: QuestionType.MCQ },
            { subjectTopicId: 'topic-2', maxMarks: 15, questionType: QuestionType.ESSAY },
          ],
        }),
        'teacher-uuid',
      );

      expect(result.topicAllocations!.find((a) => a.subjectTopicId === 'topic-1')?.questionType).toBe(
        QuestionType.MCQ,
      );
      expect(result.topicAllocations!.find((a) => a.subjectTopicId === 'topic-2')?.questionType).toBe(
        QuestionType.ESSAY,
      );
    });

    it('has no separate totalMarks field on the DTO — it structurally cannot be supplied independently', () => {
      const dto = makeDto();
      expect(Object.prototype.hasOwnProperty.call(dto, 'totalMarks')).toBe(false);
    });

    it('rejects an empty allocation list', async () => {
      await expect(
        service.create(makeDto({ topicAllocations: [] }), 'teacher-uuid'),
      ).rejects.toThrow();
      // class-validator's @ArrayMinSize enforces this at the HTTP boundary; the service itself
      // still must not silently accept an empty array if a caller bypasses validation.
    });

    it('rejects a duplicate topic in the allocation list', async () => {
      await expect(
        service.create(
          makeDto({
            topicAllocations: [
              { subjectTopicId: TOPIC_ID, maxMarks: 20, questionType: QuestionType.MCQ },
              { subjectTopicId: TOPIC_ID, maxMarks: 15, questionType: QuestionType.MCQ },
            ],
          }),
          'teacher-uuid',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a topic that belongs to a different subject', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ subjectId: 'other-subject' }));

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an archived topic', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ isArchived: true }));

      await expect(service.create(makeDto(), 'teacher-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — notifies the assigned teacher only when someone else created it', () => {
    beforeEach(() => {
      planRepo.findOne!.mockResolvedValue(makePlan(3));
      assessmentRepo.count!.mockResolvedValue(0);
      assessmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assessment-1' }));
    });

    it('notifies the assigned teacher when a Section Head creates the assessment', async () => {
      requirementRepo.findOne!.mockResolvedValue({ teacherId: 'teacher-uuid' });
      subjectTopicsService.findById.mockImplementation((id: string) =>
        Promise.resolve(makeTopic({ id, title: id === 'topic-1' ? 'Algebra' : 'Geometry' })),
      );

      await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 25, questionType: QuestionType.MCQ },
            { subjectTopicId: 'topic-2', maxMarks: 20, questionType: QuestionType.STRUCTURED },
          ],
        }),
        'section-head-uuid',
      );

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
      const [staffId, , message, type] = notificationService.createForStaff.mock.calls[0];
      expect(staffId).toBe('teacher-uuid');
      expect(message).toContain('Algebra (25)');
      expect(message).toContain('Total: 45');
      expect(type).toBe('assessment_scheduled');
    });

    it('does not notify anyone when a teacher creates their own assessment', async () => {
      requirementRepo.findOne!.mockResolvedValue({ teacherId: 'teacher-uuid' });

      await service.create(makeDto(), 'teacher-uuid');

      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not notify or fail when no teacher-subject-class requirement exists yet', async () => {
      requirementRepo.findOne!.mockResolvedValue(null);

      const result = await service.create(makeDto(), 'teacher-uuid');

      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll — "mine" includes assessments I\'m assigned to teach, not just ones I created', () => {
    it('includes an assessment created by someone else when the caller is the assigned teacher', async () => {
      const sectionHeadCreated = { id: 'a1', subjectId: SUBJECT_ID, classSectionId: 1, createdByTeacherId: 'section-head-uuid' };
      assessmentRepo.find!.mockResolvedValue([sectionHeadCreated]);
      requirementRepo.find!.mockResolvedValue([{ teacherId: 'teacher-uuid', subjectId: SUBJECT_ID, classSectionId: 1 }]);

      const result = await service.findAll(undefined, undefined, undefined, 'teacher-uuid');

      expect(requirementRepo.find).toHaveBeenCalledWith({ where: { teacherId: 'teacher-uuid' } });
      expect(assessmentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            { createdByTeacherId: 'teacher-uuid' },
            { subjectId: SUBJECT_ID, classSectionId: 1 },
          ]),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('does not query requirements when "mine" is not requested', async () => {
      assessmentRepo.find!.mockResolvedValue([]);

      await service.findAll(1, undefined, undefined, undefined);

      expect(requirementRepo.find).not.toHaveBeenCalled();
      expect(assessmentRepo.find).toHaveBeenCalledWith({ where: { termId: 1 }, order: { scheduledDate: 'ASC' } });
    });
  });

  describe('requestChange', () => {
    const ASSESSMENT_ID = 'assessment-1';

    const makeAssessment = (overrides: Partial<AssessmentEntity> = {}): AssessmentEntity =>
      ({
        id: ASSESSMENT_ID,
        subjectId: SUBJECT_ID,
        classSectionId: 1,
        title: 'Monthly Test 1',
        createdByTeacherId: 'section-head-uuid',
        ...overrides,
      } as AssessmentEntity);

    it('notifies the assessment creator with the requester name and message', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment());
      staffRepo.findOne!.mockResolvedValue({ firstName: 'Nimal', lastName: 'Perera' });
      requirementRepo.findOne!.mockResolvedValue({ teacherId: 'teacher-uuid', subjectId: SUBJECT_ID, classSectionId: 1 });

      await service.requestChange(
        ASSESSMENT_ID,
        { message: 'Can we lower the Algebra weight?' },
        'teacher-uuid',
        false,
      );

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'section-head-uuid',
        expect.stringContaining('Monthly Test 1'),
        expect.stringContaining('Nimal Perera: Can we lower the Algebra weight?'),
        'assessment_change_requested',
      );
    });

    it('throws NotFoundException for a non-existent assessment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.requestChange(ASSESSMENT_ID, { message: 'x' }, 'teacher-uuid', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a teacher not assigned to this subject/class', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment());
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.requestChange(ASSESSMENT_ID, { message: 'x' }, 'other-teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('allows a privileged caller regardless of assignment', async () => {
      assessmentRepo.findOne!.mockResolvedValue(makeAssessment());
      staffRepo.findOne!.mockResolvedValue({ firstName: 'Principal', lastName: 'User' });

      await service.requestChange(ASSESSMENT_ID, { message: 'x' }, 'principal-uuid', true);

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });
  });
});
