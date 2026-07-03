import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ResultComputationService } from './result-computation.service';
import { GradingBandService } from './grading-band.service';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { StudentSubjectEnrollmentEntity } from '../../enrollments/entities/student-subject-enrollment.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeAssessment = (overrides: Partial<AssessmentEntity> = {}): AssessmentEntity =>
  ({
    id: 'assessment-1',
    subjectId: 'subject-1',
    termId: 1,
    classSectionId: 1,
    title: 'Test',
    assessmentType: AssessmentType.MONTHLY_TEST,
    totalMarks: 50,
    ...overrides,
  } as AssessmentEntity);

const makeMark = (overrides: Partial<MarkEntity> = {}): MarkEntity =>
  ({
    id: 'mark-1',
    studentId: 'student-1',
    assessmentId: 'assessment-1',
    score: '40.00',
    maxScore: 50,
    status: MarkStatus.SUBMITTED,
    ...overrides,
  } as MarkEntity);

const makePlan = (overrides: Partial<TermAssessmentPlanEntity> = {}): TermAssessmentPlanEntity =>
  ({
    id: 1,
    subjectId: 'subject-1',
    termId: 1,
    requiredAssessmentCount: 2,
    ...overrides,
  } as TermAssessmentPlanEntity);

describe('ResultComputationService', () => {
  let service: ResultComputationService;
  let markRepo: MockRepo<MarkEntity>;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let planRepo: MockRepo<TermAssessmentPlanEntity>;
  let enrollmentRepo: MockRepo<StudentSubjectEnrollmentEntity>;
  let subjectResultRepo: MockRepo<SubjectResultEntity>;
  let termResultRepo: MockRepo<TermResultEntity>;
  let gradingBandService: { findBandForPercentage: jest.Mock };

  beforeEach(async () => {
    markRepo = repoMock<MarkEntity>();
    assessmentRepo = repoMock<AssessmentEntity>();
    planRepo = repoMock<TermAssessmentPlanEntity>();
    enrollmentRepo = repoMock<StudentSubjectEnrollmentEntity>();
    subjectResultRepo = repoMock<SubjectResultEntity>();
    termResultRepo = repoMock<TermResultEntity>();
    gradingBandService = { findBandForPercentage: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultComputationService,
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(TermAssessmentPlanEntity), useValue: planRepo },
        { provide: getRepositoryToken(StudentSubjectEnrollmentEntity), useValue: enrollmentRepo },
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
        { provide: getRepositoryToken(TermResultEntity), useValue: termResultRepo },
        { provide: GradingBandService, useValue: gradingBandService },
      ],
    }).compile();

    service = module.get<ResultComputationService>(ResultComputationService);
    jest.clearAllMocks();
    gradingBandService.findBandForPercentage.mockResolvedValue(null);
  });

  describe('recomputeSubjectResult', () => {
    it('is incomplete when no plan exists for the subject+term', async () => {
      planRepo.findOne!.mockResolvedValue(null);
      assessmentRepo.find!.mockResolvedValue([]);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.percentage).toBeNull();
    });

    it('is incomplete when a plan exists but 0 assessments have been created yet', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan({ requiredAssessmentCount: 2 }));
      assessmentRepo.find!.mockResolvedValue([]);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.totalScore).toBe('0');
      expect(result.totalMaxScore).toBe('0');
      expect(result.percentage).toBeNull();
    });

    it('is incomplete when fewer assessments exist than required', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan({ requiredAssessmentCount: 2 }));
      assessmentRepo.find!.mockResolvedValue([makeAssessment({ id: 'a1' })]);
      markRepo.find!.mockResolvedValue([makeMark({ assessmentId: 'a1' })]);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(false);
    });

    it('is incomplete when all required assessments exist but only some are submitted, and percentage reflects only submitted ones', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan({ requiredAssessmentCount: 2 }));
      assessmentRepo.find!.mockResolvedValue([
        makeAssessment({ id: 'a1', totalMarks: 50 }),
        makeAssessment({ id: 'a2', totalMarks: 50 }),
      ]);
      markRepo.find!.mockResolvedValue([
        makeMark({ assessmentId: 'a1', score: '40.00' }),
      ]);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.totalScore).toBe('40');
      expect(result.totalMaxScore).toBe('50');
    });

    it('is complete with correct totals and letter grade when all required assessments are submitted', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan({ requiredAssessmentCount: 2 }));
      assessmentRepo.find!.mockResolvedValue([
        makeAssessment({ id: 'a1', totalMarks: 50 }),
        makeAssessment({ id: 'a2', totalMarks: 50 }),
      ]);
      markRepo.find!.mockResolvedValue([
        makeMark({ assessmentId: 'a1', score: '40.00' }),
        makeMark({ assessmentId: 'a2', score: '35.00' }),
      ]);
      subjectResultRepo.findOne!.mockResolvedValue(null);
      gradingBandService.findBandForPercentage.mockResolvedValue({ letter: 'A' });

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(true);
      expect(result.totalScore).toBe('75');
      expect(result.totalMaxScore).toBe('100');
      expect(result.percentage).toBe('75');
      expect(result.letterGrade).toBe('A');
    });

    it('excludes draft marks from totals and from the submitted-count check', async () => {
      planRepo.findOne!.mockResolvedValue(makePlan({ requiredAssessmentCount: 1 }));
      assessmentRepo.find!.mockResolvedValue([makeAssessment({ id: 'a1', totalMarks: 50 })]);
      markRepo.find!.mockResolvedValue([]); // draft marks are filtered out by the repo query itself (status: SUBMITTED)
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeSubjectResult('student-1', 'subject-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.totalScore).toBe('0');
    });
  });

  describe('recomputeTermResult', () => {
    it('is incomplete with no required subjects (no enrollment)', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);
      termResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.recomputeTermResult('student-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.rank).toBeNull();
    });

    it('is incomplete when only some required subjects are complete', async () => {
      enrollmentRepo.find!.mockResolvedValue([
        { subjectId: 'subject-1' },
        { subjectId: 'subject-2' },
      ]);
      planRepo.find!.mockResolvedValue([
        makePlan({ subjectId: 'subject-1', requiredAssessmentCount: 1 }),
        makePlan({ subjectId: 'subject-2', requiredAssessmentCount: 1 }),
      ]);
      termResultRepo.findOne!.mockResolvedValue(null);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      // subject-1: complete; subject-2: incomplete (no assessments)
      planRepo.findOne!
        .mockResolvedValueOnce(makePlan({ subjectId: 'subject-1', requiredAssessmentCount: 1 }))
        .mockResolvedValueOnce(makePlan({ subjectId: 'subject-2', requiredAssessmentCount: 1 }));
      assessmentRepo.find!
        .mockResolvedValueOnce([makeAssessment({ id: 'a1', subjectId: 'subject-1', totalMarks: 50 })])
        .mockResolvedValueOnce([]);
      markRepo.find!.mockResolvedValueOnce([makeMark({ assessmentId: 'a1', score: '40.00' })]);

      const result = await service.recomputeTermResult('student-1', 1, 1);
      expect(result.isComplete).toBe(false);
    });

    it('is complete with correctly summed totals and term-level letterGrade when all required subjects are complete', async () => {
      enrollmentRepo.find!.mockResolvedValue([
        { subjectId: 'subject-1' },
        { subjectId: 'subject-2' },
      ]);
      planRepo.find!.mockResolvedValue([
        makePlan({ subjectId: 'subject-1', requiredAssessmentCount: 1 }),
        makePlan({ subjectId: 'subject-2', requiredAssessmentCount: 1 }),
      ]);
      termResultRepo.findOne!.mockResolvedValue(null);
      subjectResultRepo.findOne!.mockResolvedValue(null);

      planRepo.findOne!
        .mockResolvedValueOnce(makePlan({ subjectId: 'subject-1', requiredAssessmentCount: 1 }))
        .mockResolvedValueOnce(makePlan({ subjectId: 'subject-2', requiredAssessmentCount: 1 }));
      assessmentRepo.find!
        .mockResolvedValueOnce([makeAssessment({ id: 'a1', subjectId: 'subject-1', totalMarks: 50 })])
        .mockResolvedValueOnce([makeAssessment({ id: 'a2', subjectId: 'subject-2', totalMarks: 50 })]);
      markRepo.find!
        .mockResolvedValueOnce([makeMark({ assessmentId: 'a1', score: '40.00' })])
        .mockResolvedValueOnce([makeMark({ assessmentId: 'a2', score: '30.00' })]);

      // 70/100 = 70% → band returns 'B'
      gradingBandService.findBandForPercentage.mockResolvedValue({ letter: 'B' });

      const result = await service.recomputeTermResult('student-1', 1, 1);
      expect(result.isComplete).toBe(true);
      expect(result.totalScore).toBe('70');
      expect(result.totalMaxScore).toBe('100');
      expect(result.percentage).toBe('70');
      expect(result.letterGrade).toBe('B');
    });

    it('nulls out a previously-assigned rank when a result reverts to incomplete', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);
      termResultRepo.findOne!.mockResolvedValue(
        { studentId: 'student-1', termId: 1, isComplete: true, rank: 5 } as TermResultEntity,
      );

      const result = await service.recomputeTermResult('student-1', 1, 1);
      expect(result.isComplete).toBe(false);
      expect(result.rank).toBeNull();
    });
  });

  describe('recomputeClassRank', () => {
    const row = (id: string, totalScore: string, overrides: Partial<TermResultEntity> = {}) =>
      ({ id, studentId: id, totalScore, isComplete: true, rank: null, ...overrides } as TermResultEntity);

    it('assigns ranks 1,2,3 for all-distinct totals', async () => {
      termResultRepo.find!
        .mockResolvedValueOnce([row('s1', '100'), row('s2', '90'), row('s3', '80')])
        .mockResolvedValueOnce([]);

      await service.recomputeClassRank(1, 1);
      const saved = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(saved.map((r) => r.rank)).toEqual([1, 2, 3]);
    });

    it('shares rank for a 2-way tie and skips ahead for the next distinct value: [90,90,85] -> [1,1,3]', async () => {
      termResultRepo.find!
        .mockResolvedValueOnce([row('s1', '90'), row('s2', '90'), row('s3', '85')])
        .mockResolvedValueOnce([]);

      await service.recomputeClassRank(1, 1);
      const saved = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(saved.map((r) => r.rank)).toEqual([1, 1, 3]);
    });

    it('handles a 3-way tie: [80,80,80,70] -> [1,1,1,4]', async () => {
      termResultRepo.find!
        .mockResolvedValueOnce([row('s1', '80'), row('s2', '80'), row('s3', '80'), row('s4', '70')])
        .mockResolvedValueOnce([]);

      await service.recomputeClassRank(1, 1);
      const saved = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(saved.map((r) => r.rank)).toEqual([1, 1, 1, 4]);
    });

    it('handles tie-then-distinct-then-tie: [95,90,90,80,80,75] -> [1,2,2,4,4,6]', async () => {
      termResultRepo.find!
        .mockResolvedValueOnce([
          row('s1', '95'),
          row('s2', '90'),
          row('s3', '90'),
          row('s4', '80'),
          row('s5', '80'),
          row('s6', '75'),
        ])
        .mockResolvedValueOnce([]);

      await service.recomputeClassRank(1, 1);
      const saved = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(saved.map((r) => r.rank)).toEqual([1, 2, 2, 4, 4, 6]);
    });

    it('excludes incomplete students from ranking and nulls a stale rank', async () => {
      termResultRepo.find!
        .mockResolvedValueOnce([row('s1', '90'), row('s2', '80')]) // complete rows
        .mockResolvedValueOnce([row('s3', '0', { isComplete: false, rank: 2 })]); // stale incomplete row

      await service.recomputeClassRank(1, 1);

      const completeSaveCall = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(completeSaveCall.map((r) => r.rank)).toEqual([1, 2]);

      const staleSaveCall = (termResultRepo.save as jest.Mock).mock.calls[1][0] as TermResultEntity[];
      expect(staleSaveCall[0].rank).toBeNull();
    });
  });
});
