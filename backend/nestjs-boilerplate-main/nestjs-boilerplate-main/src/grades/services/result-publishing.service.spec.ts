import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObjectLiteral, Repository } from 'typeorm';
import { ResultPublishingService } from './result-publishing.service';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
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
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    termResultRepo = repoMock<TermResultEntity>();
    subjectResultRepo = repoMock<SubjectResultEntity>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultPublishingService,
        { provide: getRepositoryToken(TermResultEntity), useValue: termResultRepo },
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
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
