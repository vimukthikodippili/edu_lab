import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SchoolCalendarConfigService } from './school-calendar-config.service';
import { SchoolCalendarConfigEntity } from './entities/school-calendar-config.entity';
import { GradeStageService } from '../students/grade-stage.service';
import { GradeStageEntity } from '../students/entities/grade-stage.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data: Partial<T>) => data as T),
  findOneOrFail: jest.fn(),
});

const PRIMARY_STAGE: GradeStageEntity = {
  id: 'stage-primary',
  stageName: 'Primary',
  fromGrade: 1,
  toGrade: 5,
  ordering: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const COLLEGIATE_STAGE: GradeStageEntity = {
  id: 'stage-collegiate',
  stageName: 'Collegiate',
  fromGrade: 12,
  toGrade: 13,
  ordering: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeConfig = (
  overrides: Partial<SchoolCalendarConfigEntity> = {},
): SchoolCalendarConfigEntity =>
  ({
    id: 1,
    gradeStageId: PRIMARY_STAGE.id,
    gradeStage: PRIMARY_STAGE,
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
  let gradeStageService: jest.Mocked<GradeStageService>;

  beforeEach(async () => {
    repo = repoMock<SchoolCalendarConfigEntity>() as any;
    gradeStageService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      resolveStageForLevel: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolCalendarConfigService,
        { provide: getRepositoryToken(SchoolCalendarConfigEntity), useValue: repo },
        { provide: GradeStageService, useValue: gradeStageService },
      ],
    }).compile();

    service = module.get<SchoolCalendarConfigService>(SchoolCalendarConfigService);
    jest.clearAllMocks();
  });

  // ─── findByStageId ─────────────────────────────────────────────────────────────

  describe('findByStageId', () => {
    it('throws 404 when the stage itself does not exist', async () => {
      gradeStageService.findById.mockRejectedValue(new NotFoundException('Grade stage x not found.'));
      await expect(service.findByStageId('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('lazily creates a default config row (5 days / 8 periods) for a stage with no config yet', async () => {
      gradeStageService.findById.mockResolvedValue(PRIMARY_STAGE);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue(makeConfig());
      repo.findOneOrFail.mockResolvedValue(makeConfig());

      const result = await service.findByStageId(PRIMARY_STAGE.id);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gradeStageId: PRIMARY_STAGE.id, workingDaysPerWeek: 5, periodsPerDay: 8 }),
      );
      expect(result.totalWeeklySlots).toBe(40);
    });

    it('returns the existing config row when one already exists', async () => {
      gradeStageService.findById.mockResolvedValue(PRIMARY_STAGE);
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 6, periodsPerDay: 7 }));

      const result = await service.findByStageId(PRIMARY_STAGE.id);

      expect(repo.save).not.toHaveBeenCalled();
      expect(result.totalWeeklySlots).toBe(42);
    });
  });

  // ─── findByGradeLevel ───────────────────────────────────────────────────────

  describe('findByGradeLevel', () => {
    it('throws 404 when no grade stage covers the level (a gap)', async () => {
      gradeStageService.resolveStageForLevel.mockResolvedValue(null);
      await expect(service.findByGradeLevel(99)).rejects.toThrow(NotFoundException);
    });

    it('resolves the covering stage and returns its config', async () => {
      gradeStageService.resolveStageForLevel.mockResolvedValue(PRIMARY_STAGE);
      gradeStageService.findById.mockResolvedValue(PRIMARY_STAGE);
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));

      const result = await service.findByGradeLevel(3);

      expect(gradeStageService.resolveStageForLevel).toHaveBeenCalledWith(3);
      expect(result.gradeStageId).toBe(PRIMARY_STAGE.id);
    });
  });

  // ─── upsert — slot calculation ────────────────────────────────────────────────

  describe('upsert — slot calculation', () => {
    beforeEach(() => {
      gradeStageService.findById.mockResolvedValue(PRIMARY_STAGE);
    });

    it('totalWeeklySlots = workingDaysPerWeek × periodsPerDay (5×8 = 40)', async () => {
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));
      repo.save.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));
      repo.findOneOrFail.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));

      const result = await service.upsert(PRIMARY_STAGE.id, { workingDaysPerWeek: 5, periodsPerDay: 8 });

      expect(result.totalWeeklySlots).toBe(40);
    });

    it('totalWeeklySlots recalculates on update (4×6 = 24)', async () => {
      repo.findOne.mockResolvedValue(makeConfig({ workingDaysPerWeek: 5, periodsPerDay: 8 }));
      repo.save.mockResolvedValue(makeConfig({ workingDaysPerWeek: 4, periodsPerDay: 6 }));
      repo.findOneOrFail.mockResolvedValue(makeConfig({ workingDaysPerWeek: 4, periodsPerDay: 6 }));

      const result = await service.upsert(PRIMARY_STAGE.id, { workingDaysPerWeek: 4, periodsPerDay: 6 });

      expect(result.totalWeeklySlots).toBe(24);
    });
  });

  // ─── upsert — per-stage isolation ────────────────────────────────────────────

  describe('upsert — per-stage isolation', () => {
    it("upsert for the Primary stage calls findOne with gradeStageId=Primary's id only", async () => {
      gradeStageService.findById.mockResolvedValue(PRIMARY_STAGE);
      repo.findOne.mockResolvedValue(makeConfig());
      repo.save.mockResolvedValue(makeConfig());
      repo.findOneOrFail.mockResolvedValue(makeConfig());

      await service.upsert(PRIMARY_STAGE.id, { workingDaysPerWeek: 5, periodsPerDay: 7 });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { gradeStageId: PRIMARY_STAGE.id } });
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it("upsert for the Collegiate stage calls findOne with gradeStageId=Collegiate's id only", async () => {
      gradeStageService.findById.mockResolvedValue(COLLEGIATE_STAGE);
      repo.findOne.mockResolvedValue(makeConfig({ gradeStageId: COLLEGIATE_STAGE.id, gradeStage: COLLEGIATE_STAGE }));
      repo.save.mockResolvedValue(makeConfig({ gradeStageId: COLLEGIATE_STAGE.id, gradeStage: COLLEGIATE_STAGE }));
      repo.findOneOrFail.mockResolvedValue(
        makeConfig({ gradeStageId: COLLEGIATE_STAGE.id, gradeStage: COLLEGIATE_STAGE }),
      );

      await service.upsert(COLLEGIATE_STAGE.id, { workingDaysPerWeek: 5, periodsPerDay: 8 });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { gradeStageId: COLLEGIATE_STAGE.id } });
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
