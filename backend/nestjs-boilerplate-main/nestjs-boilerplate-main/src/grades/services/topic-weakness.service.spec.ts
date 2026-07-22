import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { TopicWeaknessService } from './topic-weakness.service';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { TopicWeaknessFlagEntity } from '../entities/topic-weakness-flag.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn(),
  save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const CLASS_SECTION_ID = 27;
const SUBJECT_ID = 'subject-uuid';
const TOPIC_ID = 'topic-uuid';
const STUDENT_WEAK = 'student-weak';
const STUDENT_STRONG = 'student-strong';

describe('TopicWeaknessService', () => {
  let service: TopicWeaknessService;
  let topicScoreRepo: MockRepo<MarkTopicScoreEntity>;
  let markRepo: MockRepo<MarkEntity>;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let allocationRepo: MockRepo<AssessmentTopicAllocationEntity>;
  let flagRepo: MockRepo<TopicWeaknessFlagEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    topicScoreRepo = repoMock<MarkTopicScoreEntity>();
    markRepo = repoMock<MarkEntity>();
    assessmentRepo = repoMock<AssessmentEntity>();
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>();
    flagRepo = repoMock<TopicWeaknessFlagEntity>();
    studentRepo = repoMock<StudentEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, unknown> = { 'topicWeakness.windowSize': 2 };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicWeaknessService,
        { provide: getRepositoryToken(MarkTopicScoreEntity), useValue: topicScoreRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(TopicWeaknessFlagEntity), useValue: flagRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TopicWeaknessService>(TopicWeaknessService);
  });

  describe('computeAllFlags — the explicitly-requested test', () => {
    // Two assessments allocate 20 marks to the topic, a third allocates only 10 — the
    // percentages must be normalized before averaging, not compared as raw scores.
    const makeAssessment = (id: string, scheduledDate: string) => ({
      id,
      scheduledDate: new Date(scheduledDate),
      classSectionId: CLASS_SECTION_ID,
      subjectId: SUBJECT_ID,
    });

    beforeEach(() => {
      const a1 = makeAssessment('a1', '2026-02-01');
      const a2 = makeAssessment('a2', '2026-02-08');
      const a3 = makeAssessment('a3', '2026-02-15');
      assessmentRepo.find!.mockResolvedValue([a1, a2, a3]);

      allocationRepo.find!.mockResolvedValue([
        { assessmentId: 'a1', subjectTopicId: TOPIC_ID, maxMarks: 20 },
        { assessmentId: 'a2', subjectTopicId: TOPIC_ID, maxMarks: 20 },
        { assessmentId: 'a3', subjectTopicId: TOPIC_ID, maxMarks: 10 },
      ]);

      markRepo.find!.mockResolvedValue([
        { id: 'mark-weak-1', studentId: STUDENT_WEAK, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-weak-2', studentId: STUDENT_WEAK, assessmentId: 'a2', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-1', studentId: STUDENT_STRONG, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-2', studentId: STUDENT_STRONG, assessmentId: 'a2', status: MarkStatus.SUBMITTED },
      ]);

      // weak student: 10/20 (50%), 8/20 (40%) -> avg 45%
      // strong student: 18/20 (90%), 16/20 (80%) -> avg 85%
      // class average across all 4 points: (50+40+90+80)/4 = 65%
      topicScoreRepo.find!.mockResolvedValue([
        { markId: 'mark-weak-1', subjectTopicId: TOPIC_ID, score: '10.00' },
        { markId: 'mark-weak-2', subjectTopicId: TOPIC_ID, score: '8.00' },
        { markId: 'mark-strong-1', subjectTopicId: TOPIC_ID, score: '18.00' },
        { markId: 'mark-strong-2', subjectTopicId: TOPIC_ID, score: '16.00' },
      ]);
    });

    it('flags a below-class-average student as weak', async () => {
      await service.computeAllFlags();

      const saved = (flagRepo.save as jest.Mock).mock.calls[0][0] as TopicWeaknessFlagEntity[];
      const weakRow = saved.find((r) => r.studentId === STUDENT_WEAK);
      expect(weakRow?.isWeak).toBe(true);
      expect(Number(weakRow?.studentAverage)).toBeCloseTo(45, 1);
      expect(Number(weakRow?.classAverage)).toBeCloseTo(65, 1);
    });

    it('does not flag an above-class-average student as weak', async () => {
      await service.computeAllFlags();

      const saved = (flagRepo.save as jest.Mock).mock.calls[0][0] as TopicWeaknessFlagEntity[];
      const strongRow = saved.find((r) => r.studentId === STUDENT_STRONG);
      expect(strongRow?.isWeak).toBe(false);
      expect(Number(strongRow?.studentAverage)).toBeCloseTo(85, 1);
    });

    it('normalizes scores by each assessment\'s own maxMarks before averaging (not raw scores)', async () => {
      // Weak student now has 3 data points: a1 (10/20=50%, oldest, outside the windowSize=2
      // "most recent" cut), a2 (8/20=40%), a3 (9/10=90%, on a 10-mark assessment). If the
      // service averaged raw scores instead of normalized percentages, the most-recent-2
      // average would come out around 8.5 (raw 8 and 9) instead of 65 (40% and 90%).
      markRepo.find!.mockResolvedValue([
        { id: 'mark-weak-1', studentId: STUDENT_WEAK, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-weak-2', studentId: STUDENT_WEAK, assessmentId: 'a2', status: MarkStatus.SUBMITTED },
        { id: 'mark-weak-3', studentId: STUDENT_WEAK, assessmentId: 'a3', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-1', studentId: STUDENT_STRONG, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-2', studentId: STUDENT_STRONG, assessmentId: 'a2', status: MarkStatus.SUBMITTED },
      ]);
      topicScoreRepo.find!.mockResolvedValue([
        { markId: 'mark-weak-1', subjectTopicId: TOPIC_ID, score: '10.00' },
        { markId: 'mark-weak-2', subjectTopicId: TOPIC_ID, score: '8.00' },
        { markId: 'mark-weak-3', subjectTopicId: TOPIC_ID, score: '9.00' }, // 9/10 = 90%
        { markId: 'mark-strong-1', subjectTopicId: TOPIC_ID, score: '18.00' },
        { markId: 'mark-strong-2', subjectTopicId: TOPIC_ID, score: '16.00' },
      ]);

      await service.computeAllFlags();

      const saved = (flagRepo.save as jest.Mock).mock.calls[0][0] as TopicWeaknessFlagEntity[];
      const weakRow = saved.find((r) => r.studentId === STUDENT_WEAK);
      // Most recent 2 by date are a3 (90%) and a2 (40%) -> average 65%, not ~8.5.
      expect(Number(weakRow?.studentAverage)).toBeCloseTo(65, 1);
    });

    it('skips (does not upsert) a student/topic pair with fewer than windowSize data points', async () => {
      markRepo.find!.mockResolvedValue([
        { id: 'mark-weak-1', studentId: STUDENT_WEAK, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-1', studentId: STUDENT_STRONG, assessmentId: 'a1', status: MarkStatus.SUBMITTED },
        { id: 'mark-strong-2', studentId: STUDENT_STRONG, assessmentId: 'a2', status: MarkStatus.SUBMITTED },
      ]);
      topicScoreRepo.find!.mockResolvedValue([
        { markId: 'mark-weak-1', subjectTopicId: TOPIC_ID, score: '10.00' },
        { markId: 'mark-strong-1', subjectTopicId: TOPIC_ID, score: '18.00' },
        { markId: 'mark-strong-2', subjectTopicId: TOPIC_ID, score: '16.00' },
      ]);

      await service.computeAllFlags();

      const saved = (flagRepo.save as jest.Mock).mock.calls[0][0] as TopicWeaknessFlagEntity[];
      expect(saved.find((r) => r.studentId === STUDENT_WEAK)).toBeUndefined();
      expect(saved.find((r) => r.studentId === STUDENT_STRONG)).toBeDefined();
    });

    it('does nothing when there are no assessments this academic year', async () => {
      assessmentRepo.find!.mockResolvedValue([]);

      await service.computeAllFlags();

      expect(flagRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when there is no topic-mark data at all (legacy, non-topic-tracked marks only)', async () => {
      topicScoreRepo.find!.mockResolvedValue([]);

      await service.computeAllFlags();

      expect(flagRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getForStudent', () => {
    it('throws NotFoundException for an unknown student', async () => {
      studentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getForStudent('missing-student', SUBJECT_ID, 'teacher-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the teacher does not teach this subject/class', async () => {
      studentRepo.findOne!.mockResolvedValue({ id: STUDENT_WEAK, classSectionId: CLASS_SECTION_ID });
      requirementRepo.count!.mockResolvedValue(0);

      await expect(
        service.getForStudent(STUDENT_WEAK, SUBJECT_ID, 'teacher-1', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged actor to bypass the teach-assignment check', async () => {
      studentRepo.findOne!.mockResolvedValue({ id: STUDENT_WEAK, classSectionId: CLASS_SECTION_ID });
      flagRepo.find!.mockResolvedValue([]);

      await service.getForStudent(STUDENT_WEAK, SUBJECT_ID, 'principal-1', true);

      expect(requirementRepo.count).not.toHaveBeenCalled();
    });

    it('maps flag rows to the response shape', async () => {
      studentRepo.findOne!.mockResolvedValue({ id: STUDENT_WEAK, classSectionId: CLASS_SECTION_ID });
      requirementRepo.count!.mockResolvedValue(1);
      flagRepo.find!.mockResolvedValue([
        {
          subjectTopicId: TOPIC_ID,
          subjectTopic: { title: 'Algebra' },
          isWeak: true,
          studentAverage: '45.00',
          classAverage: '65.00',
          computedAt: new Date('2026-02-08'),
        },
      ]);

      const result = await service.getForStudent(STUDENT_WEAK, SUBJECT_ID, 'teacher-1', false);

      expect(result).toEqual([
        {
          subjectTopicId: TOPIC_ID,
          title: 'Algebra',
          isWeak: true,
          studentAverage: 45,
          classAverage: 65,
          computedAt: new Date('2026-02-08'),
        },
      ]);
    });
  });
});
