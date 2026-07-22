import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchoolSettingsService } from './school-settings.service';
import { SchoolSettingsEntity } from './entities/school-settings.entity';

describe('SchoolSettingsService', () => {
  let service: SchoolSettingsService;
  let repo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => ({ lateThresholdMinutes: 10, ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolSettingsService,
        { provide: getRepositoryToken(SchoolSettingsEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<SchoolSettingsService>(SchoolSettingsService);
  });

  describe('get', () => {
    it('lazily creates the singleton row with the default threshold when none exists yet', async () => {
      const result = await service.get();

      expect(repo.create).toHaveBeenCalled();
      expect(result.lateThresholdMinutes).toBe(10);
    });

    it('returns the existing persisted row instead of creating a new one', async () => {
      repo.find.mockResolvedValue([{ id: 1, lateThresholdMinutes: 15 }]);

      const result = await service.get();

      expect(repo.create).not.toHaveBeenCalled();
      expect(result.lateThresholdMinutes).toBe(15);
    });
  });

  describe('update', () => {
    it('persists the new threshold onto the existing singleton row', async () => {
      repo.find.mockResolvedValue([{ id: 1, lateThresholdMinutes: 10 }]);

      const result = await service.update({ lateThresholdMinutes: 20 });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, lateThresholdMinutes: 20 }),
      );
      expect(result.lateThresholdMinutes).toBe(20);
    });

    it('round-trips isPublicSportsBoardEnabled when included in the DTO', async () => {
      repo.find.mockResolvedValue([{ id: 1, lateThresholdMinutes: 10, isPublicSportsBoardEnabled: false }]);

      const result = await service.update({ lateThresholdMinutes: 10, isPublicSportsBoardEnabled: true });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isPublicSportsBoardEnabled: true }),
      );
      expect(result.isPublicSportsBoardEnabled).toBe(true);
    });

    it('leaves isPublicSportsBoardEnabled untouched when omitted from the DTO', async () => {
      repo.find.mockResolvedValue([{ id: 1, lateThresholdMinutes: 10, isPublicSportsBoardEnabled: true }]);

      const result = await service.update({ lateThresholdMinutes: 15 });

      expect(result.isPublicSportsBoardEnabled).toBe(true);
    });
  });

  describe('isPublicSportsBoardEnabled', () => {
    it('reads the toggle off the singleton settings row', async () => {
      repo.find.mockResolvedValue([{ id: 1, lateThresholdMinutes: 10, isPublicSportsBoardEnabled: true }]);

      await expect(service.isPublicSportsBoardEnabled()).resolves.toBe(true);
    });

    it('defaults to false via the lazily-created row when none exists yet', async () => {
      repo.create.mockImplementation((data) => ({
        lateThresholdMinutes: 10,
        isPublicSportsBoardEnabled: false,
        ...data,
      }));

      await expect(service.isPublicSportsBoardEnabled()).resolves.toBe(false);
    });
  });
});
