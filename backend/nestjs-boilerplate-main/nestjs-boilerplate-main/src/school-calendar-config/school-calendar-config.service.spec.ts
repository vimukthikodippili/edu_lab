import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SchoolCalendarConfigService } from './school-calendar-config.service';
import { SchoolCalendarConfigEntity } from './entities/school-calendar-config.entity';
import { GradeStage } from '../students/entities/grade.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data: Partial<T>) => data as T),
});

const makeConfig = (
  overrides: Partial<SchoolCalendarConfigEntity> = {},
): SchoolCalendarConfigEntity =>
  ({
    id: 1,
    gradeStage: 'primary',
    workingDaysPerWeek: 5,
    periodsPerDay: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SchoolCalendarConfigEntity);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SchoolCalendarConfigService', () => {
  let service: SchoolCalendarConfigService;
  let repo: jest.Mocked<Repository<SchoolCalendarConfigEntity>>;

  beforeEach(async () => {
    repo = repoMock<SchoolCalendarConfigEntity>() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolCalendarConfigService,
        { provide: getRepositoryToken(SchoolCalendarConfigEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<SchoolCalendarConfigService>(SchoolCalendarConfigService);
    jest.clearAllMocks();
  });

  // ─── findByStage ─────────────────────────────────────────────────────────────

  describe('findByStage', () => {
    it('throws 404 when stage has no config row', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByStage(GradeStage.PRIMARY)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── upsert — slot calculation ────────────────────────────────────────────────

  describe('upsert — slot calculation', () => {
    it('totalWeeklySlots = workingDaysPerWeek × periodsPerDay (5×8 = 40)', async () => {
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));
      repo.save.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));

      const result = await service.upsert(GradeStage.PRIMARY, { workingDaysPerWeek: 5, periodsPerDay: 8 });

      expect(result.totalWeeklySlots).toBe(40);
    });

    it('totalWeeklySlots recalculates on update (4×6 = 24)', async () => {
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));
      repo.save.mockResolvedValue(makeConfig({ workingDaysPerWeek: 4, periodsPerDay: 6 }));

      const result = await service.upsert(GradeStage.PRIMARY, { workingDaysPerWeek: 4, periodsPerDay: 6 });

      expect(result.totalWeeklySlots).toBe(24);
    });
  });

  // ─── upsert — per-stage isolation ────────────────────────────────────────────

  describe('upsert — per-stage isolation', () => {
    it("upsert for 'primary' calls findOne with gradeStage='primary' only", async () => {
      repo.findOne.mockResolvedValue(makeConfig({ gradeStage: 'primary' }));
      repo.save.mockResolvedValue(makeConfig({ gradeStage: 'primary' }));

      await service.upsert(GradeStage.PRIMARY, { workingDaysPerWeek: 5, periodsPerDay: 7 });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { gradeStage: GradeStage.PRIMARY } });
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it("upsert for 'collegiate' calls findOne with gradeStage='collegiate' only", async () => {
      repo.findOne.mockResolvedValue(makeConfig({ gradeStage: 'collegiate' }));
      repo.save.mockResolvedValue(makeConfig({ gradeStage: 'collegiate', workingDaysPerWeek: 5, periodsPerDay: 8 }));

      await service.upsert(GradeStage.COLLEGIATE, { workingDaysPerWeek: 5, periodsPerDay: 8 });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { gradeStage: GradeStage.COLLEGIATE } });
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
