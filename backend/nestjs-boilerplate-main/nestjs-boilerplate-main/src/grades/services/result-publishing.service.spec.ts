import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObjectLiteral, Repository } from 'typeorm';
import { ResultPublishingService } from './result-publishing.service';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { ResultsPublishedEvent } from '../events/results-published.event';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeTermResult = (
  overrides: Partial<TermResultEntity> = {},
): TermResultEntity =>
  ({
    id: 'tr-1',
    studentId: 'student-1',
    termId: 1,
    classSectionId: 1,
    totalScore: '80',
    totalMaxScore: '100',
    percentage: '80',
    rank: null,
    isComplete: true,
    isPublished: false,
    publishedAt: null,
    reportCardFileId: null,
    ...overrides,
  } as TermResultEntity);

describe('ResultPublishingService', () => {
  let service: ResultPublishingService;
  let termResultRepo: MockRepo<TermResultEntity>;
  let subjectResultRepo: MockRepo<SubjectResultEntity>;
  let assessmentRepo: MockRepo<AssessmentEntity>;
  let markRepo: MockRepo<MarkEntity>;
  let topicScoreRepo: MockRepo<MarkTopicScoreEntity>;
  let allocationRepo: MockRepo<AssessmentTopicAllocationEntity>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    termResultRepo = repoMock<TermResultEntity>();
    subjectResultRepo = repoMock<SubjectResultEntity>();
    assessmentRepo = repoMock<AssessmentEntity>();
    markRepo = repoMock<MarkEntity>();
    topicScoreRepo = repoMock<MarkTopicScoreEntity>();
    allocationRepo = repoMock<AssessmentTopicAllocationEntity>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultPublishingService,
        { provide: getRepositoryToken(TermResultEntity), useValue: termResultRepo },
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(MarkTopicScoreEntity), useValue: topicScoreRepo },
        { provide: getRepositoryToken(AssessmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ResultPublishingService>(ResultPublishingService);
    jest.clearAllMocks();
  });

  describe('getPublishedTermResultForStudent', () => {
    it('queries with isPublished:true and returns null when nothing matches (not published)', async () => {
      termResultRepo.findOne!.mockResolvedValue(null);

      const result = await service.getPublishedTermResultForStudent('student-1', 1);

      expect(result).toBeNull();
      expect(termResultRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'student-1', termId: 1, isPublished: true },
        }),
      );
    });

    it('returns the result when it is published', async () => {
      const published = makeTermResult({ isPublished: true });
      termResultRepo.findOne!.mockResolvedValue(published);

      const result = await service.getPublishedTermResultForStudent('student-1', 1);

      expect(result).toBe(published);
    });
  });

  describe('getPublishedSubjectResultsForStudent', () => {
    it('returns empty array when the term result is not published', async () => {
      termResultRepo.findOne!.mockResolvedValue(null);

      const results = await service.getPublishedSubjectResultsForStudent('student-1', 1);

      expect(results).toEqual([]);
      expect(subjectResultRepo.find).not.toHaveBeenCalled();
    });

    it('returns subject results when the term result is published', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      const subjectRows = [
        { id: 'sr-1', studentId: 'student-1', subjectId: 'math' },
        { id: 'sr-2', studentId: 'student-1', subjectId: 'science' },
      ];
      subjectResultRepo.find!.mockResolvedValue(subjectRows);

      const results = await service.getPublishedSubjectResultsForStudent('student-1', 1);

      expect(results).toBe(subjectRows);
      expect(subjectResultRepo.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1', termId: 1 },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('getPublishedAssessmentResultsForStudent', () => {
    const makeAssessment = (overrides: Partial<AssessmentEntity> = {}): AssessmentEntity =>
      ({
        id: 'a1',
        subjectId: 'subject-1',
        termId: 1,
        classSectionId: 1,
        title: 'Monthly Test 1',
        assessmentType: AssessmentType.MONTHLY_TEST,
        scheduledDate: new Date('2026-02-01'),
        totalMarks: 35,
        ...overrides,
      } as AssessmentEntity);

    it('returns empty array when the term result is not published', async () => {
      termResultRepo.findOne!.mockResolvedValue(null);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toEqual([]);
      expect(assessmentRepo.find).not.toHaveBeenCalled();
    });

    it('returns empty array when no subject result exists for that subject/term', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue(null);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toEqual([]);
    });

    it('returns empty array when the subject has no assessments', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue({ classSectionId: 1 });
      assessmentRepo.find!.mockResolvedValue([]);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toEqual([]);
      expect(markRepo.find).not.toHaveBeenCalled();
    });

    it('returns empty array when the student has no submitted marks among those assessments', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue({ classSectionId: 1 });
      assessmentRepo.find!.mockResolvedValue([makeAssessment()]);
      markRepo.find!.mockResolvedValue([]);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toEqual([]);
    });

    it('includes a full topic breakdown for a topic-tracked assessment, with maxMarks resolved from the allocation', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue({ classSectionId: 1 });
      assessmentRepo.find!.mockResolvedValue([makeAssessment({ id: 'a1', totalMarks: 35 })]);
      markRepo.find!.mockResolvedValue([
        { id: 'mark-1', assessmentId: 'a1', score: '30.00', maxScore: 35, status: MarkStatus.SUBMITTED },
      ]);
      topicScoreRepo.find!.mockResolvedValue([
        { markId: 'mark-1', subjectTopicId: 'topic-a', score: '18.00', subjectTopic: { title: 'Algebra' } },
        { markId: 'mark-1', subjectTopicId: 'topic-b', score: '12.00', subjectTopic: { title: 'General' } },
      ]);
      allocationRepo.find!.mockResolvedValue([
        { assessmentId: 'a1', subjectTopicId: 'topic-a', maxMarks: 20 },
        { assessmentId: 'a1', subjectTopicId: 'topic-b', maxMarks: 15 },
      ]);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(30);
      expect(results[0].maxScore).toBe(35);
      expect(results[0].topicScores).toEqual([
        { subjectTopicId: 'topic-a', title: 'Algebra', maxMarks: 20, score: 18 },
        { subjectTopicId: 'topic-b', title: 'General', maxMarks: 15, score: 12 },
      ]);
    });

    it('gracefully falls back to an empty topicScores array for a legacy assessment with no topic allocations', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue({ classSectionId: 1 });
      assessmentRepo.find!.mockResolvedValue([makeAssessment({ id: 'a1', totalMarks: 100 })]);
      markRepo.find!.mockResolvedValue([
        { id: 'mark-1', assessmentId: 'a1', score: '80.00', maxScore: 100, status: MarkStatus.SUBMITTED },
      ]);
      topicScoreRepo.find!.mockResolvedValue([]);
      allocationRepo.find!.mockResolvedValue([]);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(80);
      expect(results[0].topicScores).toEqual([]);
    });

    it('sorts results chronologically by scheduledDate regardless of input order', async () => {
      termResultRepo.findOne!.mockResolvedValue({ id: 'tr-1' });
      subjectResultRepo.findOne!.mockResolvedValue({ classSectionId: 1 });
      assessmentRepo.find!.mockResolvedValue([
        makeAssessment({ id: 'a2', scheduledDate: new Date('2026-03-01') }),
        makeAssessment({ id: 'a1', scheduledDate: new Date('2026-02-01') }),
      ]);
      markRepo.find!.mockResolvedValue([
        { id: 'mark-2', assessmentId: 'a2', score: '10.00', maxScore: 35, status: MarkStatus.SUBMITTED },
        { id: 'mark-1', assessmentId: 'a1', score: '20.00', maxScore: 35, status: MarkStatus.SUBMITTED },
      ]);
      topicScoreRepo.find!.mockResolvedValue([]);
      allocationRepo.find!.mockResolvedValue([]);

      const results = await service.getPublishedAssessmentResultsForStudent('student-1', 'subject-1', 1);

      expect(results.map((r) => r.assessment.id)).toEqual(['a1', 'a2']);
    });
  });

  describe('publishClassResults', () => {
    it('skips incomplete rows entirely and counts them', async () => {
      termResultRepo.find!.mockResolvedValue([
        makeTermResult({ studentId: 's1', isComplete: true, isPublished: false }),
        makeTermResult({ studentId: 's2', isComplete: false, isPublished: false }),
      ]);

      const summary = await service.publishClassResults(1, 1);

      expect(summary.publishedCount).toBe(1);
      expect(summary.skippedIncompleteCount).toBe(1);
      expect(summary.alreadyPublishedCount).toBe(0);

      const saved = (termResultRepo.save as jest.Mock).mock.calls[0][0] as TermResultEntity[];
      expect(saved).toHaveLength(1);
      expect(saved[0].studentId).toBe('s1');
      expect(saved[0].isPublished).toBe(true);
      expect(saved[0].publishedAt).toBeInstanceOf(Date);
    });

    it('excludes already-published rows from save and the event, but counts them', async () => {
      termResultRepo.find!.mockResolvedValue([
        makeTermResult({ studentId: 's1', isComplete: true, isPublished: true }),
      ]);

      const summary = await service.publishClassResults(1, 1);

      expect(summary.publishedCount).toBe(0);
      expect(summary.alreadyPublishedCount).toBe(1);
      expect(termResultRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('emits results.published with exactly the newly-published student IDs', async () => {
      termResultRepo.find!.mockResolvedValue([
        makeTermResult({ studentId: 's1', isComplete: true, isPublished: false }),
        makeTermResult({ studentId: 's2', isComplete: true, isPublished: false }),
        makeTermResult({ studentId: 's3', isComplete: true, isPublished: true }),
      ]);

      await service.publishClassResults(5, 2);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventName, event] = eventEmitter.emit.mock.calls[0];
      expect(eventName).toBe('results.published');
      expect(event).toBeInstanceOf(ResultsPublishedEvent);
      expect((event as ResultsPublishedEvent).studentIds).toEqual(['s1', 's2']);
      expect((event as ResultsPublishedEvent).classSectionId).toBe(5);
      expect((event as ResultsPublishedEvent).termId).toBe(2);
    });

    it('computes correct mixed-fixture summary counts', async () => {
      termResultRepo.find!.mockResolvedValue([
        makeTermResult({ studentId: 's1', isComplete: true, isPublished: false }),
        makeTermResult({ studentId: 's2', isComplete: true, isPublished: true }),
        makeTermResult({ studentId: 's3', isComplete: false, isPublished: false }),
        makeTermResult({ studentId: 's4', isComplete: false, isPublished: false }),
      ]);

      const summary = await service.publishClassResults(1, 1);

      expect(summary).toEqual({
        classSectionId: 1,
        termId: 1,
        publishedCount: 1,
        skippedIncompleteCount: 2,
        alreadyPublishedCount: 1,
      });
    });
  });
});
