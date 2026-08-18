import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import {
  PerformanceTrendService,
  isTermSequenceDeclining,
  isTermSequenceImproving,
  buildTopicRecommendation,
  FORBIDDEN_CLINICAL_TERMS,
} from './performance-trend.service';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TopicTermSnapshotEntity } from '../entities/topic-term-snapshot.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const studentId = 'student-uuid';
const subjectId = 'subject-maths';
const classSectionId = 10;
const algebraId = 'topic-algebra';
const geometryId = 'topic-geometry';

const makeTerm = (id: number, termNumber: number) => ({
  id,
  // Matches the real AcademicTermEntity.name convention, which already bakes in the year
  // (e.g. "Term 1 2026") — termLabel must not append academicYear a second time.
  name: `Term ${termNumber} 2026`,
  termNumber,
  academicYear: '2026',
});

const makeSubjectResult = (termId: number, termNumber: number, percentage: number): SubjectResultEntity =>
  ({
    id: `sr-${termId}`,
    studentId,
    subjectId,
    termId,
    classSectionId,
    totalScore: '0',
    totalMaxScore: '0',
    percentage: String(percentage),
    letterGrade: null,
    subjectRank: 2,
    subjectClassAveragePercentage: '65.00',
    isComplete: true,
    subject: { id: subjectId, name: 'Mathematics' },
    term: makeTerm(termId, termNumber),
  } as unknown as SubjectResultEntity);

const makeSnapshot = (
  termId: number,
  subjectTopicId: string,
  title: string,
  studentAverage: number,
  classAverage: number,
): TopicTermSnapshotEntity =>
  ({
    id: `snap-${termId}-${subjectTopicId}`,
    studentId,
    subjectId,
    subjectTopicId,
    termId,
    classSectionId,
    studentAverage: String(studentAverage),
    classAverage: String(classAverage),
    isWeak: studentAverage < 50,
    assessmentCount: 2,
    computedAt: new Date(),
    subjectTopic: { id: subjectTopicId, title },
  } as unknown as TopicTermSnapshotEntity);

describe('PerformanceTrendService', () => {
  let service: PerformanceTrendService;
  let subjectResultRepo: jest.Mocked<Repository<SubjectResultEntity>>;
  let snapshotRepo: jest.Mocked<Repository<TopicTermSnapshotEntity>>;
  let markRepo: jest.Mocked<Repository<MarkEntity>>;
  let assessmentRepo: jest.Mocked<Repository<AssessmentEntity>>;
  let topicScoreRepo: jest.Mocked<Repository<MarkTopicScoreEntity>>;
  let allocationRepo: jest.Mocked<Repository<AssessmentTopicAllocationEntity>>;
  let studentRepo: jest.Mocked<Repository<StudentEntity>>;
  let requirementRepo: jest.Mocked<Repository<TeacherSubjectClassRequirementEntity>>;

  beforeEach(async () => {
    subjectResultRepo = repoMock<SubjectResultEntity>() as any;
    snapshotRepo = repoMock<TopicTermSnapshotEntity>() as any;
    markRepo = repoMock<MarkEntity>() as any;
    assessmentRepo = repoMock<AssessmentEntity>() as any;
    topicScoreRepo = repoMock<MarkTopicScoreEntity>() as any;
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>() as any;
    studentRepo = repoMock<StudentEntity>() as any;
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>() as any;

    studentRepo.findOne!.mockResolvedValue({
      id: studentId,
      firstName: 'Nimal',
      lastName: 'Perera',
      grade: { name: 'Grade 8' },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceTrendService,
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
        { provide: getRepositoryToken(TopicTermSnapshotEntity), useValue: snapshotRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(MarkTopicScoreEntity), useValue: topicScoreRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
      ],
    }).compile();

    service = module.get(PerformanceTrendService);
  });

  describe('isTermSequenceDeclining / isTermSequenceImproving — pure functions', () => {
    it('classifies the spec\'s own Algebra sequence (60, 55, 48) as declining', () => {
      expect(isTermSequenceDeclining([60, 55, 48])).toBe(true);
      expect(isTermSequenceImproving([60, 55, 48])).toBe(false);
    });

    it('classifies the spec\'s own Geometry sequence (80, 82, 85) as improving', () => {
      expect(isTermSequenceImproving([80, 82, 85])).toBe(true);
      expect(isTermSequenceDeclining([80, 82, 85])).toBe(false);
    });

    it('requires at least 3 points', () => {
      expect(isTermSequenceDeclining([60, 55])).toBe(false);
      expect(isTermSequenceImproving([60, 65])).toBe(false);
    });
  });

  describe('buildTopicRecommendation — content safety', () => {
    it('never contains a forbidden clinical term for any topic name', () => {
      const topicNames = ['Algebra', 'Geometry', 'Photosynthesis', 'this topic'];
      for (const name of topicNames) {
        const text = buildTopicRecommendation(name).toLowerCase();
        for (const term of FORBIDDEN_CLINICAL_TERMS) {
          expect(text).not.toContain(term);
        }
      }
    });
  });

  describe('getPerformanceTrend — reproduces the spec\'s own worked example', () => {
    beforeEach(() => {
      subjectResultRepo.find!.mockImplementation(({ where }: any) => {
        if (where.studentId) {
          return Promise.resolve([
            makeSubjectResult(1, 1, 70),
            makeSubjectResult(2, 2, 68.5),
            makeSubjectResult(3, 3, 66.5),
          ]);
        }
        // Peer-rows lookup for year-class-rank — return just this student's own row so rank
        // resolves trivially (rank 1 of 1) without needing a full peer dataset.
        return Promise.resolve([makeSubjectResult(1, 1, 70)]);
      });
      subjectResultRepo.count!.mockResolvedValue(3);

      snapshotRepo.find!.mockResolvedValue([
        makeSnapshot(1, algebraId, 'Algebra', 60, 55),
        makeSnapshot(1, geometryId, 'Geometry', 80, 75),
        makeSnapshot(2, algebraId, 'Algebra', 55, 52),
        makeSnapshot(2, geometryId, 'Geometry', 82, 76),
        makeSnapshot(3, algebraId, 'Algebra', 48, 50),
        makeSnapshot(3, geometryId, 'Geometry', 85, 78),
      ]);
    });

    it('returns 3 term entries for the one year', async () => {
      const result = await service.getPerformanceTrend(studentId, subjectId);
      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0].yearlyTrends).toHaveLength(1);
      expect(result.subjects[0].yearlyTrends[0].termTrends).toHaveLength(3);
    });

    it('Algebra topic trend is declining, Geometry is improving', async () => {
      const result = await service.getPerformanceTrend(studentId, subjectId);
      const topicTrends = result.subjects[0].topicTrends;
      const algebra = topicTrends.find((t) => t.subjectTopicId === algebraId)!;
      const geometry = topicTrends.find((t) => t.subjectTopicId === geometryId)!;
      expect(algebra.trend).toBe('declining');
      expect(geometry.trend).toBe('improving');
    });

    it('Algebra isWeak=true only in Term 3 (48% < 50%); Geometry is never weak', async () => {
      const result = await service.getPerformanceTrend(studentId, subjectId);
      const terms = result.subjects[0].yearlyTrends[0].termTrends;

      const algebraByTerm = terms.map((t) => t.topicBreakdown.find((tb) => tb.subjectTopicId === algebraId)!);
      expect(algebraByTerm.map((a) => a.isWeak)).toEqual([false, false, true]);

      const geometryByTerm = terms.map((t) => t.topicBreakdown.find((tb) => tb.subjectTopicId === geometryId)!);
      expect(geometryByTerm.every((g) => !g.isWeak)).toBe(true);
    });

    it('weakTopicsCurrently (latest term) includes Algebra with a non-clinical recommendation', async () => {
      const result = await service.getPerformanceTrend(studentId, subjectId);
      const weak = result.subjects[0].weakTopicsCurrently;
      expect(weak).toHaveLength(1);
      expect(weak[0].topicName).toBe('Algebra');
      expect(weak[0].recommendation.toLowerCase()).not.toContain('disorder');
    });

    it('personalBestTerm is Term 1 (highest subject average, 70%)', async () => {
      const result = await service.getPerformanceTrend(studentId, subjectId);
      expect(result.subjects[0].personalBestTerm).toEqual({ termLabel: 'Term 1 2026', average: 70 });
    });

    it('throws 404 for an unknown student', async () => {
      studentRepo.findOne!.mockResolvedValue(null);
      await expect(service.getPerformanceTrend('unknown', subjectId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('teacherEverTaught', () => {
    it('true when the teacher has a requirement for any class section in the student\'s history', async () => {
      requirementRepo.count!.mockResolvedValue(1);
      const ok = await service.teacherEverTaught('teacher-1', subjectId, [
        makeSubjectResult(1, 1, 70),
      ]);
      expect(ok).toBe(true);
    });

    it('false when the teacher never taught any of the student\'s historical class sections', async () => {
      requirementRepo.count!.mockResolvedValue(0);
      const ok = await service.teacherEverTaught('teacher-1', subjectId, [
        makeSubjectResult(1, 1, 70),
      ]);
      expect(ok).toBe(false);
    });

    it('false when the student has no history at all for this subject', async () => {
      const ok = await service.teacherEverTaught('teacher-1', subjectId, []);
      expect(ok).toBe(false);
      expect(requirementRepo.count).not.toHaveBeenCalled();
    });
  });

  describe('computeTopicSnapshotsForTerm', () => {
    const termId = 5;
    const assessmentId = 'assessment-1';

    beforeEach(() => {
      assessmentRepo.find!.mockResolvedValue([
        { id: assessmentId, termId, classSectionId, subjectId, totalMarks: 100 } as any,
      ]);
      markRepo.find!.mockResolvedValue([
        { id: 'mark-1', studentId: 'student-a', assessmentId, status: MarkStatus.SUBMITTED } as any,
        { id: 'mark-2', studentId: 'student-b', assessmentId, status: MarkStatus.SUBMITTED } as any,
      ]);
      topicScoreRepo.find!.mockResolvedValue([
        { markId: 'mark-1', subjectTopicId: algebraId, score: '12' } as any,
        { markId: 'mark-2', subjectTopicId: algebraId, score: '8' } as any,
      ]);
      allocationRepo.find!.mockResolvedValue([
        { assessmentId, subjectTopicId: algebraId, maxMarks: 20 } as any,
      ]);
    });

    it('computes studentAverage/classAverage and the absolute 50% isWeak threshold', async () => {
      const count = await service.computeTopicSnapshotsForTerm(termId);
      expect(count).toBe(2);

      // student-a: 12/20 = 60%, student-b: 8/20 = 40%. Class average = mean(60,40) = 50.
      const saved = (snapshotRepo.save as jest.Mock).mock.calls[0][0] as TopicTermSnapshotEntity[];
      const rowA = saved.find((r) => r.studentId === 'student-a')!;
      const rowB = saved.find((r) => r.studentId === 'student-b')!;

      expect(Number(rowA.studentAverage)).toBe(60);
      expect(rowA.isWeak).toBe(false);
      expect(Number(rowB.studentAverage)).toBe(40);
      expect(rowB.isWeak).toBe(true);
      expect(Number(rowA.classAverage)).toBe(50);
    });

    it('upserts on (studentId, subjectTopicId, termId) — does not touch other terms\' rows', async () => {
      snapshotRepo.findOne!.mockResolvedValue(null);
      await service.computeTopicSnapshotsForTerm(termId);
      expect(snapshotRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ termId }),
        }),
      );
    });

    it('returns 0 and does not query marks when the term has no assessments', async () => {
      assessmentRepo.find!.mockResolvedValue([]);
      const count = await service.computeTopicSnapshotsForTerm(999);
      expect(count).toBe(0);
      expect(markRepo.find).not.toHaveBeenCalled();
    });

    it('a studentIds scope only limits which rows are SAVED, never who counts toward classAverage', async () => {
      // Regression test for a real bug found during live verification: when only student-a
      // was newly published, computeTopicSnapshotsForTerm was previously filtering the marks
      // query itself by studentIds, silently excluding student-b from the classAverage —
      // making a solo-published student's "class average" equal to their own score.
      const count = await service.computeTopicSnapshotsForTerm(termId, undefined, ['student-a']);
      expect(count).toBe(1);

      const saved = (snapshotRepo.save as jest.Mock).mock.calls[0][0] as TopicTermSnapshotEntity[];
      expect(saved).toHaveLength(1);
      expect(saved[0].studentId).toBe('student-a');
      // Still the full-class average (60, 40) -> 50, not student-a's own 60.
      expect(Number(saved[0].classAverage)).toBe(50);
    });
  });
});
