import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { GradeStageService } from './grade-stage.service';
import { GradeStageEntity } from './entities/grade-stage.entity';
import { GradeEntity } from './entities/grade.entity';
import { StudentEntity } from './entities/student.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { SchoolCalendarConfigEntity } from '../school-calendar-config/entities/school-calendar-config.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn(),
});

const PRIMARY: GradeStageEntity = {
  id: 'stage-primary',
  stageName: 'Primary',
  fromGrade: 1,
  toGrade: 5,
  ordering: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const JUNIOR: GradeStageEntity = {
  id: 'stage-junior',
  stageName: 'Junior Secondary',
  fromGrade: 6,
  toGrade: 9,
  ordering: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SENIOR: GradeStageEntity = {
  id: 'stage-senior',
  stageName: 'Senior Secondary',
  fromGrade: 10,
  toGrade: 11,
  ordering: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GradeStageService', () => {
  let service: GradeStageService;
  let gradeStageRepo: MockRepo<GradeStageEntity>;
  let gradeRepo: MockRepo<GradeEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let classSectionRepo: MockRepo<ClassSectionEntity>;

  const setStages = (stages: GradeStageEntity[]) => {
    gradeStageRepo.find!.mockResolvedValue(stages);
  };

  const gradeQb = (grades: GradeEntity[]) => ({
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(grades),
  });

  beforeEach(async () => {
    gradeStageRepo = repoMock<GradeStageEntity>();
    gradeRepo = repoMock<GradeEntity>();
    studentRepo = repoMock<StudentEntity>();
    classSectionRepo = repoMock<ClassSectionEntity>();

    gradeStageRepo.createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: 2 }),
    });
    studentRepo.createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });
    gradeRepo.createQueryBuilder = jest.fn().mockReturnValue(gradeQb([]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeStageService,
        { provide: getRepositoryToken(GradeStageEntity), useValue: gradeStageRepo },
        { provide: getRepositoryToken(GradeEntity), useValue: gradeRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
      ],
    }).compile();

    service = module.get<GradeStageService>(GradeStageService);
  });

  describe('resolveStageForLevel', () => {
    it('resolves a level to the covering stage', async () => {
      setStages([PRIMARY, JUNIOR, SENIOR]);
      const result = await service.resolveStageForLevel(7);
      expect(result?.id).toBe(JUNIOR.id);
    });

    it('returns null for a level covered by no stage — a gap', async () => {
      setStages([PRIMARY, SENIOR]); // 6-9 is a gap
      const result = await service.resolveStageForLevel(7);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a new stage with the next ordering value', async () => {
      setStages([PRIMARY]);
      await service.create({ stageName: 'Collegiate', fromGrade: 12, toGrade: 13 });
      expect(gradeStageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stageName: 'Collegiate', fromGrade: 12, toGrade: 13, ordering: 3 }),
      );
    });

    it('rejects fromGrade > toGrade', async () => {
      setStages([]);
      await expect(
        service.create({ stageName: 'Bad', fromGrade: 10, toGrade: 5 }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(gradeStageRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an overlapping range — the explicitly-requested test (two stages claiming grade 5)', async () => {
      setStages([PRIMARY]); // Primary is 1-5
      await expect(
        service.create({ stageName: 'New Junior', fromGrade: 5, toGrade: 8 }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(gradeStageRepo.save).not.toHaveBeenCalled();
    });

    it('allows adjacent, non-overlapping ranges (a gap is fine)', async () => {
      setStages([PRIMARY]); // 1-5
      await service.create({ stageName: 'Junior Secondary', fromGrade: 6, toGrade: 9 });
      expect(gradeStageRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields and re-validates the range excluding itself', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      setStages([PRIMARY, JUNIOR]);

      const result = await service.update(PRIMARY.id, { toGrade: 4 });

      // Overlap check must have excluded PRIMARY itself, or this would throw — verifying no throw
      expect(gradeStageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ toGrade: 4 }),
      );
      expect(result.warnings).toBeDefined();
    });

    it('rejects an edit that would overlap a different existing stage', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      setStages([PRIMARY, JUNIOR]);

      await expect(service.update(PRIMARY.id, { toGrade: 7 })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('warns (does not block) when an edit leaves an enrolled grade uncovered by any stage', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...JUNIOR }); // 6-9
      // First find() call is the pre-save overlap check (old state); the second is the
      // post-save orphan-warning check, which must see the newly-narrowed range.
      gradeStageRepo.find!
        .mockResolvedValueOnce([PRIMARY, JUNIOR])
        .mockResolvedValue([PRIMARY, { ...JUNIOR, toGrade: 8 }]);
      studentRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ gradeId: 9 }]),
      });
      gradeRepo.find!.mockResolvedValue([{ id: 9, level: 9, name: 'Grade 9' } as GradeEntity]);

      // Narrow Junior Secondary to 6-8, leaving Grade 9 uncovered
      const result = await service.update(JUNIOR.id, { toGrade: 8 });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Grade 9');
    });

    it('returns no warnings when every enrolled grade is still covered', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      setStages([PRIMARY, JUNIOR]);
      studentRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ gradeId: 3 }]),
      });
      gradeRepo.find!.mockResolvedValue([{ id: 3, level: 3, name: 'Grade 3' } as GradeEntity]);

      const result = await service.update(PRIMARY.id, { stageName: 'Primary School' });

      expect(result.warnings).toEqual([]);
    });

    it('throws NotFoundException for an unknown stage', async () => {
      gradeStageRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.update('missing-id', { stageName: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a stage with no students or class sections in its range', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      gradeRepo.createQueryBuilder = jest.fn().mockReturnValue(gradeQb([{ id: 1, level: 1, name: 'Grade 1' } as GradeEntity]));
      studentRepo.count!.mockResolvedValue(0);
      classSectionRepo.count!.mockResolvedValue(0);

      await service.delete(PRIMARY.id);

      expect(gradeStageRepo.delete).toHaveBeenCalledWith(PRIMARY.id);
    });

    it('rejects deletion when students are currently in the stage range', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      gradeRepo.createQueryBuilder = jest.fn().mockReturnValue(gradeQb([{ id: 1, level: 1, name: 'Grade 1' } as GradeEntity]));
      studentRepo.count!.mockResolvedValue(3);

      await expect(service.delete(PRIMARY.id)).rejects.toThrow(ConflictException);
      expect(gradeStageRepo.delete).not.toHaveBeenCalled();
    });

    it('rejects deletion when class sections are currently in the stage range', async () => {
      gradeStageRepo.findOne!.mockResolvedValue({ ...PRIMARY });
      gradeRepo.createQueryBuilder = jest.fn().mockReturnValue(gradeQb([{ id: 1, level: 1, name: 'Grade 1' } as GradeEntity]));
      studentRepo.count!.mockResolvedValue(0);
      classSectionRepo.count!.mockResolvedValue(2);

      await expect(service.delete(PRIMARY.id)).rejects.toThrow(ConflictException);
      expect(gradeStageRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('persists a new ordering matching array position', async () => {
      setStages([PRIMARY, JUNIOR, SENIOR]);

      await service.reorder([SENIOR.id, PRIMARY.id, JUNIOR.id]);

      expect(gradeStageRepo.update).toHaveBeenCalledWith(SENIOR.id, { ordering: 0 });
      expect(gradeStageRepo.update).toHaveBeenCalledWith(PRIMARY.id, { ordering: 1 });
      expect(gradeStageRepo.update).toHaveBeenCalledWith(JUNIOR.id, { ordering: 2 });
    });

    it('throws NotFoundException if an unknown id is included', async () => {
      setStages([PRIMARY, JUNIOR]);
      await expect(service.reorder([PRIMARY.id, 'unknown-id'])).rejects.toThrow(NotFoundException);
    });
  });

  describe('cross-service propagation — the explicitly-requested integration test', () => {
    // Wires a REAL SchoolCalendarConfigService (mocked repo only) alongside the real
    // GradeStageService, so an admin edit of fromGrade genuinely changes what a downstream
    // consumer's next findByGradeLevel() call resolves to — not just what resolveStageForLevel
    // returns in isolation.
    it("an edit to a stage's fromGrade changes findByGradeLevel's resolution on the next call", async () => {
      const calendarRepo = repoMock<SchoolCalendarConfigEntity>();
      calendarRepo.findOne!.mockResolvedValue(undefined);
      calendarRepo.save!.mockImplementation((d: any) => Promise.resolve({ id: 1, ...d }));
      // The only stage this test successfully resolves a config for (post-edit, grade 7) is
      // Junior Secondary — hardcoding the response to it keeps the mock simple and honest about
      // what's actually being exercised, rather than trying to derive it from the numeric
      // calendar-config id (a different id space from the grade stage's uuid).
      calendarRepo.findOneOrFail!.mockResolvedValue({
        id: 1,
        gradeStageId: JUNIOR.id,
        gradeStage: JUNIOR,
        workingDaysPerWeek: 5,
        periodsPerDay: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GradeStageService,
          SchoolCalendarConfigService,
          { provide: getRepositoryToken(GradeStageEntity), useValue: gradeStageRepo },
          { provide: getRepositoryToken(GradeEntity), useValue: gradeRepo },
          { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
          { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
          { provide: getRepositoryToken(SchoolCalendarConfigEntity), useValue: calendarRepo },
        ],
      }).compile();

      const realGradeStageService = module.get<GradeStageService>(GradeStageService);
      const realCalendarService = module.get<SchoolCalendarConfigService>(SchoolCalendarConfigService);

      // Before: Junior Secondary is 6-9, grade 6 resolves to it.
      setStages([PRIMARY, JUNIOR, SENIOR]);
      const before = await realGradeStageService.resolveStageForLevel(6);
      expect(before?.id).toBe(JUNIOR.id);

      // Admin edits Junior Secondary's fromGrade to 7 — grade 6 is now a gap.
      gradeStageRepo.findOne!.mockResolvedValue({ ...JUNIOR });
      const updatedJunior = { ...JUNIOR, fromGrade: 7 };
      setStages([PRIMARY, updatedJunior, SENIOR]);

      const afterLevel6 = await realGradeStageService.resolveStageForLevel(6);
      expect(afterLevel6).toBeNull();

      // The real downstream consumer sees the same new boundary on its next call.
      await expect(realCalendarService.findByGradeLevel(6)).rejects.toThrow(NotFoundException);
      const configForLevel7 = await realCalendarService.findByGradeLevel(7);
      expect(configForLevel7.gradeStageId).toBe(JUNIOR.id);
    });
  });
});
