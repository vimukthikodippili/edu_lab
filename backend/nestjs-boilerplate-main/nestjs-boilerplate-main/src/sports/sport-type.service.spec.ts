import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { SportTypeService } from './sport-type.service';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEntity } from './entities/sport.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  delete: jest.fn(),
});

const SPORT_TYPE_ID = 'sport-type-uuid';

const makeSportType = (overrides: Partial<SportTypeEntity> = {}): SportTypeEntity =>
  ({
    id: SPORT_TYPE_ID,
    name: 'Karate',
    isPersonalBestEligible: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as SportTypeEntity);

describe('SportTypeService', () => {
  let service: SportTypeService;
  let sportTypeRepo: MockRepo<SportTypeEntity>;
  let sportRepo: MockRepo<SportEntity>;
  let sportMetricRepo: MockRepo<SportMetricEntity>;

  beforeEach(async () => {
    sportTypeRepo = repoMock<SportTypeEntity>();
    sportRepo = repoMock<SportEntity>();
    sportMetricRepo = repoMock<SportMetricEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SportTypeService,
        { provide: getRepositoryToken(SportTypeEntity), useValue: sportTypeRepo },
        { provide: getRepositoryToken(SportEntity), useValue: sportRepo },
        { provide: getRepositoryToken(SportMetricEntity), useValue: sportMetricRepo },
      ],
    }).compile();

    service = module.get<SportTypeService>(SportTypeService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new sport type — e.g. admin adding Karate', async () => {
      const result = await service.create({ name: 'Karate', isPersonalBestEligible: false });

      expect(sportTypeRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('defaults isPersonalBestEligible to false when omitted', async () => {
      await service.create({ name: 'Karate' });

      expect(sportTypeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isPersonalBestEligible: false }),
      );
    });
  });

  describe('update', () => {
    it('updates the name and eligibility flag of an existing sport type', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(makeSportType());

      const result = await service.update(SPORT_TYPE_ID, {
        name: 'Karate (Kumite)',
        isPersonalBestEligible: true,
      });

      expect(sportTypeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Karate (Kumite)', isPersonalBestEligible: true }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when the sport type does not exist', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.update('missing-id', { name: 'Karate' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a sport type not referenced by any sport', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(makeSportType());
      sportRepo.count!.mockResolvedValue(0);

      await service.delete(SPORT_TYPE_ID);

      expect(sportMetricRepo.delete).toHaveBeenCalledWith({ sportTypeId: SPORT_TYPE_ID });
      expect(sportTypeRepo.delete).toHaveBeenCalledWith(SPORT_TYPE_ID);
    });

    it('rejects deletion when a sport currently references this type — the explicitly-requested test', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(makeSportType());
      sportRepo.count!.mockResolvedValue(2);

      await expect(service.delete(SPORT_TYPE_ID)).rejects.toThrow(ConflictException);
      expect(sportTypeRepo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the sport type does not exist', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.delete('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('metric management', () => {
    it('lists metrics for a sport type ordered by ordering', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(makeSportType());
      sportMetricRepo.find!.mockResolvedValue([{ id: 'm1', metricName: 'Points scored', ordering: 1 }]);

      const result = await service.findMetrics(SPORT_TYPE_ID);

      expect(sportMetricRepo.find).toHaveBeenCalledWith({
        where: { sportTypeId: SPORT_TYPE_ID },
        order: { ordering: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when listing metrics for a non-existent sport type', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.findMetrics('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('creates a metric under an existing sport type', async () => {
      sportTypeRepo.findOne!.mockResolvedValue(makeSportType());

      const result = await service.createMetric(SPORT_TYPE_ID, {
        metricName: 'Points scored',
        ordering: 1,
      });

      expect(sportMetricRepo.save).toHaveBeenCalledTimes(1);
      expect(sportMetricRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sportTypeId: SPORT_TYPE_ID, metricName: 'Points scored' }),
      );
      expect(result).toBeDefined();
    });

    it('updates an existing metric', async () => {
      sportMetricRepo.findOne!.mockResolvedValue({
        id: 'm1',
        sportTypeId: SPORT_TYPE_ID,
        metricName: 'Points scored',
        unit: null,
        isTimeBased: false,
        isDistanceBased: false,
        ordering: 1,
      });

      await service.updateMetric('m1', { metricName: 'Points won' });

      expect(sportMetricRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ metricName: 'Points won' }),
      );
    });

    it('throws NotFoundException when updating a non-existent metric', async () => {
      sportMetricRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.updateMetric('missing-id', { metricName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes an existing metric', async () => {
      sportMetricRepo.findOne!.mockResolvedValue({ id: 'm1', sportTypeId: SPORT_TYPE_ID });

      await service.deleteMetric('m1');

      expect(sportMetricRepo.delete).toHaveBeenCalledWith('m1');
    });

    it('throws NotFoundException when deleting a non-existent metric', async () => {
      sportMetricRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.deleteMetric('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
