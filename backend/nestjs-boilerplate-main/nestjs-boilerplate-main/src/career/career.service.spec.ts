import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CareerAssessmentService } from './career.service';
import { CareerAssessmentEntity } from './entities/career-assessment.entity';

describe('CareerAssessmentService', () => {
  let service: CareerAssessmentService;
  let assessmentRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let savedRows: Record<string, unknown>[];

  beforeEach(async () => {
    savedRows = [];
    assessmentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => {
        const row = { id: `assessment-${savedRows.length + 1}`, ...d };
        savedRows.push(row);
        return Promise.resolve(row);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerAssessmentService,
        { provide: getRepositoryToken(CareerAssessmentEntity), useValue: assessmentRepo },
      ],
    }).compile();

    service = module.get<CareerAssessmentService>(CareerAssessmentService);
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 1));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('submitOcean', () => {
    it('creates a new assessment row keyed only by userId, tagged with the current academic year, with computed scores', async () => {
      const answers = [{ questionId: 'O1', value: 5 }];

      const result = await service.submitOcean(42, answers);

      expect(assessmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, academicYear: '2026', oceanAnswers: answers }),
      );
      expect(result.oceanScores).toBeDefined();
      expect(result.academicYear).toBe('2026');
    });

    it('rejects a second attempt in the same academic year (FR-CE-05: once per year)', async () => {
      assessmentRepo.findOne.mockResolvedValue({ id: 'existing', userId: 42, academicYear: '2026' });

      await expect(service.submitOcean(42, [])).rejects.toThrow(ConflictException);
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('the explicitly-requested guarantee: retaking in a NEW academic year creates a second, independent row rather than mutating the first', async () => {
      // Year 1 attempt.
      const yearOneRow = await service.submitOcean(42, [{ questionId: 'O1', value: 5 }]);
      expect(savedRows).toHaveLength(1);

      // Move to the next academic year and retake.
      assessmentRepo.findOne.mockResolvedValue(null); // no existing row for the new year
      jest.setSystemTime(new Date(2027, 5, 1));
      const yearTwoRow = await service.submitOcean(42, [{ questionId: 'O1', value: 1 }]);

      expect(savedRows).toHaveLength(2);
      expect(yearTwoRow.id).not.toBe(yearOneRow.id);
      expect(yearTwoRow.academicYear).toBe('2027');
      // The first row's fields are byte-for-byte unchanged — never mutated.
      expect(yearOneRow.academicYear).toBe('2026');
      expect(yearOneRow.oceanAnswers).toEqual([{ questionId: 'O1', value: 5 }]);
    });
  });

  describe('submitRiasec — ownership guarantee', () => {
    it('throws NotFoundException for an unknown assessment id', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);

      await expect(service.submitRiasec(42, 'missing-id', [])).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the assessment belongs to a different user', async () => {
      assessmentRepo.findOne.mockResolvedValue({ id: 'assessment-1', userId: 999 });

      await expect(service.submitRiasec(42, 'assessment-1', [])).rejects.toThrow(
        ForbiddenException,
      );
      expect(assessmentRepo.save).not.toHaveBeenCalled();
    });

    it('completes the attempt when the assessment genuinely belongs to the caller', async () => {
      assessmentRepo.findOne.mockResolvedValue({ id: 'assessment-1', userId: 42, oceanScores: {} });

      const result = await service.submitRiasec(42, 'assessment-1', [
        { questionId: 'R1', value: 5 },
      ]);

      expect(result.riasecScores).toBeDefined();
      expect(result.riasecSuggestions).toBeDefined();
    });
  });

  describe('findMyResults', () => {
    it('scopes the query to the caller\'s own userId, newest first', async () => {
      await service.findMyResults(42);

      expect(assessmentRepo.find).toHaveBeenCalledWith({
        where: { userId: 42 },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findForUser — counselor review path (FR-CE-04)', () => {
    it('queries by the given userId, same shape as findMyResults', async () => {
      await service.findForUser(99);

      expect(assessmentRepo.find).toHaveBeenCalledWith({
        where: { userId: 99 },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
