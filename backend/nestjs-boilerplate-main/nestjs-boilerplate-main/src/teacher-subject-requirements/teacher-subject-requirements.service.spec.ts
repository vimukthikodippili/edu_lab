import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TeacherSubjectRequirementsService } from './teacher-subject-requirements.service';
import { TeacherSubjectClassRequirementEntity } from './entities/teacher-subject-class-requirement.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GradeEntity, GradeStage } from '../students/entities/grade.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
  createQueryBuilder: jest.fn(),
});

const makeGrade = (stage: GradeStage): GradeEntity =>
  ({ id: 1, level: 10, name: 'Grade 10', stage } as GradeEntity);

const makeSection = (stage = GradeStage.SENIOR_SECONDARY): ClassSectionEntity =>
  ({ id: 1, name: 'A', academicYear: '2026', gradeId: 1, grade: makeGrade(stage) } as ClassSectionEntity);

const makeStaff = (): StaffEntity =>
  ({ id: 'teacher-uuid', firstName: 'T', lastName: 'P', status: StaffStatus.ACTIVE } as StaffEntity);

const makeSubject = (): SubjectEntity =>
  ({ id: 'subject-uuid', code: 'MATH01', name: 'Mathematics', isActive: true } as SubjectEntity);

const makeReq = (
  overrides: Partial<TeacherSubjectClassRequirementEntity> = {},
): TeacherSubjectClassRequirementEntity =>
  ({
    id: 1,
    teacherId: 'teacher-uuid',
    subjectId: 'subject-uuid',
    classSectionId: 1,
    periodsPerWeek: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TeacherSubjectClassRequirementEntity);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TeacherSubjectRequirementsService', () => {
  let service: TeacherSubjectRequirementsService;
  let repo: jest.Mocked<Repository<TeacherSubjectClassRequirementEntity>>;
  let staffRepo: jest.Mocked<Repository<StaffEntity>>;
  let subjectRepo: jest.Mocked<Repository<SubjectEntity>>;
  let classSectionRepo: jest.Mocked<Repository<ClassSectionEntity>>;
  let calendarSvc: jest.Mocked<SchoolCalendarConfigService>;

  const buildQb = (sum: number) => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: String(sum) }),
    } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;
    return qb;
  };

  beforeEach(async () => {
    repo = repoMock<TeacherSubjectClassRequirementEntity>() as any;
    staffRepo = repoMock<StaffEntity>() as any;
    subjectRepo = repoMock<SubjectEntity>() as any;
    classSectionRepo = repoMock<ClassSectionEntity>() as any;
    calendarSvc = {
      findByStage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherSubjectRequirementsService,
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: repo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: SchoolCalendarConfigService, useValue: calendarSvc },
      ],
    }).compile();

    service = module.get<TeacherSubjectRequirementsService>(TeacherSubjectRequirementsService);
    jest.clearAllMocks();
  });

  // ─── findByTeacher ─────────────────────────────────────────────────────────

  describe('findByTeacher', () => {
    it("returns only the given teacher's own requirement rows, ordered by createdAt ascending", async () => {
      repo.find.mockResolvedValue([makeReq({ id: 1 }), makeReq({ id: 2 })]);

      const result = await service.findByTeacher('teacher-uuid');

      expect(repo.find).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-uuid' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when the teacher has no requirements', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findByTeacher('teacher-with-no-classes');

      expect(result).toEqual([]);
    });
  });

  // ─── create — duplicate → 409 ─────────────────────────────────────────────

  describe('create', () => {
    it('throws 409 when same (teacherId, subjectId, classSectionId) already exists', async () => {
      staffRepo.findOne.mockResolvedValue(makeStaff());
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      classSectionRepo.findOne.mockResolvedValue(makeSection());
      repo.findOne.mockResolvedValue(makeReq()); // duplicate exists

      await expect(
        service.create({
          teacherId: 'teacher-uuid',
          subjectId: 'subject-uuid',
          classSectionId: 1,
          periodsPerWeek: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 422 when new periodsPerWeek would exceed totalWeeklySlots', async () => {
      staffRepo.findOne.mockResolvedValue(makeStaff());
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      classSectionRepo.findOne.mockResolvedValue(makeSection());
      repo.findOne.mockResolvedValue(null); // no duplicate
      // Calendar config: 40 total slots
      calendarSvc.findByStage.mockResolvedValue({
        id: 1,
        gradeStage: 'senior_secondary',
        workingDaysPerWeek: 5,
        periodsPerDay: 8,
        totalWeeklySlots: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Existing allocation: 36 periods already taken
      repo.createQueryBuilder.mockReturnValue(buildQb(36));

      // Trying to add 5 more → 36 + 5 = 41 > 40 → 422
      await expect(
        service.create({
          teacherId: 'teacher-uuid',
          subjectId: 'subject-uuid',
          classSectionId: 1,
          periodsPerWeek: 5,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('saves successfully when allocation is within limit', async () => {
      staffRepo.findOne.mockResolvedValue(makeStaff());
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      classSectionRepo.findOne.mockResolvedValue(makeSection());
      repo.findOne.mockResolvedValue(null);
      calendarSvc.findByStage.mockResolvedValue({
        id: 1,
        gradeStage: 'senior_secondary',
        workingDaysPerWeek: 5,
        periodsPerDay: 8,
        totalWeeklySlots: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo.createQueryBuilder.mockReturnValue(buildQb(30)); // 30 + 5 = 35 ≤ 40
      repo.save.mockResolvedValue(makeReq({ periodsPerWeek: 5 }));

      const result = await service.create({
        teacherId: 'teacher-uuid',
        subjectId: 'subject-uuid',
        classSectionId: 1,
        periodsPerWeek: 5,
      });

      expect(repo.save).toHaveBeenCalled();
      expect(result.periodsPerWeek).toBe(5);
    });
  });

  // ─── update — over-allocation → 422 ──────────────────────────────────────

  describe('update', () => {
    it('throws 422 when updated value would push classSectionId over totalWeeklySlots', async () => {
      repo.findOne.mockResolvedValue(makeReq({ id: 1, periodsPerWeek: 5 }));
      classSectionRepo.findOne.mockResolvedValue(makeSection());
      calendarSvc.findByStage.mockResolvedValue({
        id: 1,
        gradeStage: 'senior_secondary',
        workingDaysPerWeek: 5,
        periodsPerDay: 8,
        totalWeeklySlots: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Others already allocate 38 (excluding self)
      repo.createQueryBuilder.mockReturnValue(buildQb(38));

      // Updating to 10 → 38 + 10 = 48 > 40 → 422
      await expect(service.update(1, { periodsPerWeek: 10 })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ─── findByClassSection — totals ─────────────────────────────────────────

  describe('findByClassSection', () => {
    it('returns correct allocatedPeriods and availablePeriods', async () => {
      classSectionRepo.findOne.mockResolvedValue(makeSection());
      calendarSvc.findByStage.mockResolvedValue({
        id: 1,
        gradeStage: 'senior_secondary',
        workingDaysPerWeek: 5,
        periodsPerDay: 8,
        totalWeeklySlots: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Three requirements: 5 + 4 + 3 = 12
      repo.find.mockResolvedValue([
        makeReq({ id: 1, periodsPerWeek: 5 }),
        makeReq({ id: 2, periodsPerWeek: 4 }),
        makeReq({ id: 3, periodsPerWeek: 3 }),
      ]);

      const result = await service.findByClassSection(1);

      expect(result.allocatedPeriods).toBe(12);
      expect(result.availablePeriods).toBe(28); // 40 - 12
      expect(result.totalWeeklySlots).toBe(40);
    });
  });
});
