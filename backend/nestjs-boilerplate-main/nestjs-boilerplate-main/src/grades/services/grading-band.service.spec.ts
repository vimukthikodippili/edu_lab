import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { GradingBandService } from './grading-band.service';
import { GradingBandEntity } from '../entities/grading-band.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeBand = (
  overrides: Partial<{ id: number; minPercent: string; maxPercent: string; letter: string }> = {},
): GradingBandEntity =>
  ({
    id: 1,
    minPercent: '0.00',
    maxPercent: '34.99',
    letter: 'W',
    ordering: 5,
    ...overrides,
  } as GradingBandEntity);

describe('GradingBandService', () => {
  let service: GradingBandService;
  let bandRepo: MockRepo<GradingBandEntity>;

  beforeEach(async () => {
    bandRepo = repoMock<GradingBandEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradingBandService,
        { provide: getRepositoryToken(GradingBandEntity), useValue: bandRepo },
      ],
    }).compile();

    service = module.get<GradingBandService>(GradingBandService);
    jest.clearAllMocks();
  });

  describe('findBandForPercentage', () => {
    const defaultBands: GradingBandEntity[] = [
      makeBand({ id: 1, minPercent: '75.00', maxPercent: '100.00', letter: 'A' }),
      makeBand({ id: 2, minPercent: '65.00', maxPercent: '74.99', letter: 'B' }),
      makeBand({ id: 3, minPercent: '55.00', maxPercent: '64.99', letter: 'C' }),
      makeBand({ id: 4, minPercent: '35.00', maxPercent: '54.99', letter: 'S' }),
      makeBand({ id: 5, minPercent: '0.00', maxPercent: '34.99', letter: 'W' }),
    ];

    it('returns band A for the lower inclusive boundary (75)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(75);
      expect(result?.letter).toBe('A');
    });

    it('returns band A for the upper inclusive boundary (100)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(100);
      expect(result?.letter).toBe('A');
    });

    it('returns band B for 74.99 (just below A)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(74.99);
      expect(result?.letter).toBe('B');
    });

    it('returns band B for the lower inclusive boundary (65)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(65);
      expect(result?.letter).toBe('B');
    });

    it('returns band C for a mid-range value (60)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(60);
      expect(result?.letter).toBe('C');
    });

    it('returns band S for the lower inclusive boundary (35)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(35);
      expect(result?.letter).toBe('S');
    });

    it('returns band W for the lower inclusive boundary (0)', async () => {
      bandRepo.find!.mockResolvedValue(defaultBands);
      const result = await service.findBandForPercentage(0);
      expect(result?.letter).toBe('W');
    });

    it('returns null when the percentage falls in a gap of the configured scale', async () => {
      bandRepo.find!.mockResolvedValue([
        makeBand({ id: 1, minPercent: '0.00', maxPercent: '30.00', letter: 'W' }),
        makeBand({ id: 2, minPercent: '40.00', maxPercent: '100.00', letter: 'A' }),
      ]);
      const result = await service.findBandForPercentage(35);
      expect(result).toBeNull();
    });

    it('returns null when no bands are configured', async () => {
      bandRepo.find!.mockResolvedValue([]);
      const result = await service.findBandForPercentage(50);
      expect(result).toBeNull();
    });

    it('returns the first match when bands overlap (defensive, not a feature)', async () => {
      bandRepo.find!.mockResolvedValue([
        makeBand({ id: 1, minPercent: '50.00', maxPercent: '80.00', letter: 'X' }),
        makeBand({ id: 2, minPercent: '60.00', maxPercent: '90.00', letter: 'Y' }),
      ]);
      const result = await service.findBandForPercentage(70);
      expect(result?.letter).toBe('X');
    });
  });

  describe('create — overlap validation', () => {
    it('rejects a range that overlaps an existing band', async () => {
      bandRepo.find!.mockResolvedValue([
        makeBand({ id: 1, minPercent: '65.00', maxPercent: '75.00' }),
      ]);
      await expect(
        service.create({ minPercent: 60, maxPercent: 70, letter: 'X', ordering: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(bandRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a range fully contained within an existing band', async () => {
      bandRepo.find!.mockResolvedValue([
        makeBand({ id: 1, minPercent: '0.00', maxPercent: '100.00' }),
      ]);
      await expect(
        service.create({ minPercent: 40, maxPercent: 60, letter: 'X', ordering: 1 }),
      ).rejects.toThrow(ConflictException);
      expect(bandRepo.save).not.toHaveBeenCalled();
    });

    it('allows an adjacent, non-overlapping range', async () => {
      bandRepo.find!.mockResolvedValue([
        makeBand({ id: 1, minPercent: '0.00', maxPercent: '34.99' }),
        makeBand({ id: 2, minPercent: '55.00', maxPercent: '64.99' }),
      ]);
      bandRepo.save!.mockResolvedValue(
        makeBand({ id: 3, minPercent: '35.00', maxPercent: '54.99', letter: 'S' }),
      );
      await expect(
        service.create({ minPercent: 35, maxPercent: 54.99, letter: 'S', ordering: 4 }),
      ).resolves.toBeDefined();
      expect(bandRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('update — overlap validation excludes self', () => {
    it('allows updating a band to its own unchanged range', async () => {
      const band = makeBand({ id: 1, minPercent: '65.00', maxPercent: '74.99', letter: 'B' });
      bandRepo.findOne!.mockResolvedValue(band);
      bandRepo.find!.mockResolvedValue([]);
      bandRepo.save!.mockResolvedValue(band);

      await expect(
        service.update(1, { minPercent: 65, maxPercent: 74.99 }),
      ).resolves.toBeDefined();
      expect(bandRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
