import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimetableService } from './timetable.service';
import { TimetableEntryEntity, TimetableEntryStatus } from './entities/timetable-entry.entity';
import { TimetableRecordEntity } from './entities/timetable-record.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GradeEntity } from '../students/entities/grade.entity';
import { GradeStageEntity } from '../students/entities/grade-stage.entity';
import { GradeStageService } from '../students/grade-stage.service';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { TimetableFinalizedEvent } from './events/timetable-finalized.event';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 0 }),
  create: jest.fn((d: Partial<T>) => d as T),
  createQueryBuilder: jest.fn(),
});

const makeGrade = (): GradeEntity => ({ id: 1, level: 10, name: 'Grade 10' } as GradeEntity);

const makeSection = (id = 1): ClassSectionEntity =>
  ({ id, name: 'A', academicYear: '2026', gradeId: 1, grade: makeGrade() } as ClassSectionEntity);

const SENIOR_SECONDARY_STAGE: GradeStageEntity = {
  id: 'stage-senior-secondary',
  stageName: 'Senior Secondary',
  fromGrade: 10,
  toGrade: 11,
  ordering: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const makeStaff = (id = 'teacher-uuid'): StaffEntity =>
  ({ id, firstName: 'Test', lastName: 'Teacher', status: StaffStatus.ACTIVE } as StaffEntity);

const makeSubject = (id = 'subject-uuid'): SubjectEntity =>
  ({ id, code: 'MATH01', name: 'Mathematics', isActive: true } as SubjectEntity);

const makeRequirement = (
  overrides: Partial<TeacherSubjectClassRequirementEntity> = {},
): TeacherSubjectClassRequirementEntity =>
  ({
    id: 1,
    teacherId: 'teacher-uuid',
    subjectId: 'subject-uuid',
    classSectionId: 1,
    periodsPerWeek: 5,
    teacher: makeStaff(),
    subject: makeSubject(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TeacherSubjectClassRequirementEntity);

const makeEntry = (
  overrides: Partial<TimetableEntryEntity> = {},
): TimetableEntryEntity =>
  ({
    id: 1,
    academicYear: '2026',
    classSectionId: 1,
    day: 1,
    period: 1,
    teacherId: 'teacher-uuid',
    subjectId: 'subject-uuid',
    roomNumber: null,
    generatedAt: new Date(),
    ...overrides,
  } as TimetableEntryEntity);

const makeCalendarConfig = (workingDaysPerWeek = 5, periodsPerDay = 8) => ({
  id: 1,
  gradeStageId: SENIOR_SECONDARY_STAGE.id,
  gradeStage: SENIOR_SECONDARY_STAGE,
  workingDaysPerWeek,
  periodsPerDay,
  totalWeeklySlots: workingDaysPerWeek * periodsPerDay,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const buildDeleteQb = () => {
  const qb = {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  } as unknown as SelectQueryBuilder<TimetableEntryEntity>;
  return qb;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TimetableService', () => {
  let service: TimetableService;
  let entryRepo: jest.Mocked<Repository<TimetableEntryEntity>>;
  let recordRepo: jest.Mocked<Repository<TimetableRecordEntity>>;
  let requirementRepo: jest.Mocked<Repository<TeacherSubjectClassRequirementEntity>>;
  let classSectionRepo: jest.Mocked<Repository<ClassSectionEntity>>;
  let calendarSvc: jest.Mocked<SchoolCalendarConfigService>;
  let gradeStageService: jest.Mocked<GradeStageService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    entryRepo = repoMock<TimetableEntryEntity>() as any;
    recordRepo = repoMock<TimetableRecordEntity>() as any;
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>() as any;
    classSectionRepo = repoMock<ClassSectionEntity>() as any;
    calendarSvc = { findAll: jest.fn(), findByGradeLevel: jest.fn() } as any;
    gradeStageService = { findAll: jest.fn().mockResolvedValue([SENIOR_SECONDARY_STAGE]) } as any;
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: entryRepo },
        { provide: getRepositoryToken(TimetableRecordEntity), useValue: recordRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: SchoolCalendarConfigService, useValue: calendarSvc },
        { provide: GradeStageService, useValue: gradeStageService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TimetableService>(TimetableService);
    jest.clearAllMocks();
  });

  // ─── generate: all periodsPerWeek satisfied ──────────────────────────────

  describe('generate', () => {
    it('creates the correct number of entries when all requirements can be satisfied', async () => {
      // 2 classes, 2 requirements each: 3+4 periods for class 1, 3+2 for class 2 = 12 entries
      const section1 = makeSection(1);
      const section2 = makeSection(2);

      classSectionRepo.find.mockResolvedValue([section1, section2]);

      const reqDeleteQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          makeRequirement({ id: 1, classSectionId: 1, teacherId: 'teacher-A', periodsPerWeek: 3, teacher: makeStaff('teacher-A') }),
          makeRequirement({ id: 2, classSectionId: 1, teacherId: 'teacher-B', periodsPerWeek: 4, teacher: makeStaff('teacher-B') }),
          makeRequirement({ id: 3, classSectionId: 2, teacherId: 'teacher-A', periodsPerWeek: 3, teacher: makeStaff('teacher-A') }),
          makeRequirement({ id: 4, classSectionId: 2, teacherId: 'teacher-C', periodsPerWeek: 2, teacher: makeStaff('teacher-C') }),
        ]),
      } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(reqDeleteQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(reqDeleteQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]);
      entryRepo.save.mockResolvedValue([] as any);

      const result = await service.generate({ academicYear: '2026' });

      expect(result.entriesCreated).toBe(12); // 3+4+3+2
      expect(result.conflictsCount).toBe(0);
    });

    it('no teacher appears twice in the same day+period across all generated entries', async () => {
      // One teacher, two different class sections — greedy must assign to different slots
      const section1 = makeSection(1);
      const section2 = makeSection(2);

      classSectionRepo.find.mockResolvedValue([section1, section2]);

      const sharedTeacherId = 'shared-teacher';
      const requirements = [
        makeRequirement({ id: 1, classSectionId: 1, teacherId: sharedTeacherId, periodsPerWeek: 2, teacher: makeStaff(sharedTeacherId) }),
        makeRequirement({ id: 2, classSectionId: 2, teacherId: sharedTeacherId, periodsPerWeek: 2, teacher: makeStaff(sharedTeacherId) }),
      ];

      let savedEntries: Partial<TimetableEntryEntity>[] = [];
      const reqQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(requirements),
      } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(reqQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(reqQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]);
      entryRepo.save.mockImplementation(async (entries: any) => {
        savedEntries = entries as Partial<TimetableEntryEntity>[];
        return entries;
      });

      await service.generate({ academicYear: '2026' });

      // Assert no teacher+day+period duplicate
      const teacherSlots = new Set<string>();
      for (const e of savedEntries) {
        const key = `${e.teacherId}-${e.day}-${e.period}`;
        expect(teacherSlots.has(key)).toBe(false);
        teacherSlots.add(key);
      }
    });

    it('records a conflict when a teacher cannot fill all required periods', async () => {
      // One class, one teacher, 40 periods required but grid only has 5×8=40 slots
      // But we put 39 periods for another teacher first, leaving only 1 slot for ours
      const section = makeSection(1);
      classSectionRepo.find.mockResolvedValue([section]);

      const requirements = [
        // This requirement goes first (10 > 5 so sorted first): fills 10 slots for teacher-A
        makeRequirement({ id: 1, classSectionId: 1, teacherId: 'teacher-A', periodsPerWeek: 10, teacher: makeStaff('teacher-A') }),
        // teacher-B also wants 10, but after teacher-A fills 10 class slots, only 30 remain for the class
        // but teacher-A and teacher-B share no slots, so teacher-B can get all 10 from remaining class slots
        // Let's use 35 for teacher-A and 10 for teacher-B — 35+10=45 > 40 so teacher-B gets 5
        makeRequirement({ id: 2, classSectionId: 1, teacherId: 'teacher-B', periodsPerWeek: 35, teacher: makeStaff('teacher-B') }),
        makeRequirement({ id: 3, classSectionId: 1, teacherId: 'teacher-C', periodsPerWeek: 10, teacher: makeStaff('teacher-C') }),
      ];

      const reqQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(requirements),
      } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(reqQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(reqQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]); // 40 total slots
      entryRepo.save.mockResolvedValue([] as any);

      const result = await service.generate({ academicYear: '2026' });

      // Total requested: 10+35+10=55, available: 40 — must have at least 1 conflict
      expect(result.conflictsCount).toBeGreaterThan(0);
    });

    it('replaces existing entries for the academicYear before inserting new ones', async () => {
      const section = makeSection(1);
      classSectionRepo.find.mockResolvedValue([section]);

      const deleteQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          makeRequirement({ id: 1, periodsPerWeek: 2 }),
        ]),
      } as unknown as SelectQueryBuilder<TimetableEntryEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(deleteQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(deleteQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]);
      entryRepo.save.mockResolvedValue([] as any);

      await service.generate({ academicYear: '2026' });

      // The delete queryBuilder must have been called
      const calls = entryRepo.createQueryBuilder.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('completes generation for a ~30-class dataset well within 30 seconds (FR-P2-TG-05)', async () => {
      const sectionCount = 30;
      const sections = Array.from({ length: sectionCount }, (_, i) => makeSection(i + 1));
      classSectionRepo.find.mockResolvedValue(sections);

      const requirements = sections.map((s, i) =>
        makeRequirement({
          id: i + 1,
          classSectionId: s.id,
          teacherId: `teacher-${i + 1}`,
          periodsPerWeek: 5,
          teacher: makeStaff(`teacher-${i + 1}`),
        }),
      );

      const reqQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(requirements),
      } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(reqQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(reqQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]);
      entryRepo.save.mockResolvedValue([] as any);

      const result = await service.generate({ academicYear: '2026' });

      expect(result.entriesCreated).toBe(sectionCount * 5);
      expect(result.durationMs).toBeLessThan(30000);
    });

    it('marks every generated entry with status: draft', async () => {
      const section = makeSection(1);
      classSectionRepo.find.mockResolvedValue([section]);

      const reqQb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeRequirement({ periodsPerWeek: 3 })]),
      } as unknown as SelectQueryBuilder<TeacherSubjectClassRequirementEntity>;

      entryRepo.createQueryBuilder.mockReturnValue(reqQb as any);
      requirementRepo.createQueryBuilder.mockReturnValue(reqQb as any);

      calendarSvc.findAll.mockResolvedValue([makeCalendarConfig(5, 8)]);
      let savedEntries: Partial<TimetableEntryEntity>[] = [];
      entryRepo.save.mockImplementation(async (entries: any) => {
        savedEntries = entries;
        return entries;
      });

      await service.generate({ academicYear: '2026' });

      expect(savedEntries.length).toBeGreaterThan(0);
      expect(savedEntries.every((e) => e.status === TimetableEntryStatus.DRAFT)).toBe(true);
    });

    it('throws when the timetable for that academic year is already finalized', async () => {
      recordRepo.findOne.mockResolvedValueOnce({
        id: 1,
        academicYear: '2026',
        isLocked: true,
        finalizedAt: new Date(),
        finalizedBy: null,
      } as TimetableRecordEntity);

      await expect(service.generate({ academicYear: '2026' })).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(classSectionRepo.find).not.toHaveBeenCalled();
    });
  });

  // ─── updateEntry — teacher conflict → 409 ────────────────────────────────

  describe('updateEntry', () => {
    it('throws 409 when the new slot is already occupied by the same teacher', async () => {
      const existingEntry = makeEntry({ id: 1, day: 1, period: 1 });
      const conflictingEntry = makeEntry({ id: 99, day: 2, period: 3 });

      entryRepo.findOne
        .mockResolvedValueOnce(existingEntry)   // load entry by id
        .mockResolvedValueOnce(conflictingEntry) // teacher conflict check
        .mockResolvedValueOnce(null);            // class conflict check (not reached)

      recordRepo.findOne.mockResolvedValueOnce(null); // not locked

      await expect(
        service.updateEntry(1, { day: 2, period: 3 }),
      ).rejects.toThrow(ConflictException);
    });

    it('logs a room conflict but still saves when the requested room is already booked at that day+period', async () => {
      const existingEntry = makeEntry({ id: 1, day: 1, period: 1, roomNumber: null, status: TimetableEntryStatus.CONFIRMED });
      const roomClash = makeEntry({
        id: 50,
        day: 1,
        period: 1,
        roomNumber: 'Room 5',
        classSection: { id: 9, name: 'B' } as any,
        subject: { id: 'subject-other', name: 'Science' } as any,
        teacher: { id: 'teacher-other', firstName: 'Nimal', lastName: 'Perera' } as any,
      });

      entryRepo.findOne
        .mockResolvedValueOnce(existingEntry) // load entry by id
        .mockResolvedValueOnce(roomClash);    // room-conflict check (no day/period change, so teacher/class checks are skipped)

      recordRepo.findOne.mockResolvedValueOnce(null); // not locked
      entryRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.updateEntry(1, { roomNumber: 'Room 5' });

      expect(result.roomConflict).not.toBeNull();
      expect(result.roomConflict?.conflictingEntry.classSection.name).toBe('B');
      expect(result.roomConflict?.conflictingEntry.teacher.name).toBe('Nimal Perera');
      expect(entryRepo.save).toHaveBeenCalled(); // soft constraint — never blocks the save
    });

    it('returns roomConflict: null when the requested room is free at that day+period', async () => {
      const existingEntry = makeEntry({ id: 1, day: 1, period: 1, roomNumber: null, status: TimetableEntryStatus.CONFIRMED });

      entryRepo.findOne
        .mockResolvedValueOnce(existingEntry) // load entry by id
        .mockResolvedValueOnce(null);         // room-conflict check — nothing found

      recordRepo.findOne.mockResolvedValueOnce(null);
      entryRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.updateEntry(1, { roomNumber: 'Room 9' });

      expect(result.roomConflict).toBeNull();
    });

    it('flips a draft entry to confirmed status on any successful manual edit', async () => {
      const existingEntry = makeEntry({ id: 1, day: 1, period: 1, status: TimetableEntryStatus.DRAFT });

      entryRepo.findOne
        .mockResolvedValueOnce(existingEntry) // load entry by id
        .mockResolvedValueOnce(null)          // teacher conflict check (day/period changing)
        .mockResolvedValueOnce(null);         // class conflict check

      recordRepo.findOne.mockResolvedValueOnce(null);
      entryRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.updateEntry(1, { day: 2, period: 3 });

      expect(result.status).toBe(TimetableEntryStatus.CONFIRMED);
      expect(result.roomConflict).toBeNull();
    });

    it('succeeds without ever checking the timetable lock status — manual edits remain allowed once finalized', async () => {
      const existingEntry = makeEntry({ id: 1, day: 1, period: 1, status: TimetableEntryStatus.PUBLISHED });

      entryRepo.findOne
        .mockResolvedValueOnce(existingEntry) // load entry by id
        .mockResolvedValueOnce(null);         // room-conflict check

      entryRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.updateEntry(1, { roomNumber: 'Room 2' });

      expect(result.roomConflict).toBeNull();
      expect(recordRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── deleteEntry ──────────────────────────────────────────────────────────

  describe('deleteEntry', () => {
    it('succeeds without ever checking the timetable lock status — manual edits remain allowed once finalized', async () => {
      const existingEntry = makeEntry({ id: 1, status: TimetableEntryStatus.PUBLISHED });
      entryRepo.findOne.mockResolvedValueOnce(existingEntry);
      entryRepo.remove.mockResolvedValue(existingEntry as any);

      await service.deleteEntry(1);

      expect(entryRepo.remove).toHaveBeenCalledWith(existingEntry);
      expect(recordRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ─── finalize ────────────────────────────────────────────────────────────

  describe('finalize', () => {
    it('emits TimetableFinalizedEvent exactly once with correct payload when finalize succeeds', async () => {
      recordRepo.findOne.mockResolvedValueOnce(null); // no existing record
      recordRepo.create.mockReturnValue({
        academicYear: '2026',
        isLocked: true,
        finalizedAt: expect.any(Date),
        finalizedBy: null,
      } as any);
      recordRepo.save.mockResolvedValue({
        academicYear: '2026',
        isLocked: true,
        finalizedAt: new Date(),
        finalizedBy: null,
      } as any);

      const rawTeachers = [{ teacherId: 'teacher-A' }, { teacherId: 'teacher-B' }];
      const selectQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawTeachers),
      } as unknown as SelectQueryBuilder<TimetableEntryEntity>;
      entryRepo.createQueryBuilder.mockReturnValue(selectQb as any);

      await service.finalize({ academicYear: '2026' });

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventName, event] = (eventEmitter.emit as jest.Mock).mock.calls[0];
      expect(eventName).toBe('timetable.finalized');
      expect(event).toBeInstanceOf(TimetableFinalizedEvent);
      expect(event.academicYear).toBe('2026');
      expect(event.teacherIds).toEqual(['teacher-A', 'teacher-B']);
    });

    it('sets every entry for the academic year to status: published', async () => {
      recordRepo.findOne.mockResolvedValueOnce(null);
      recordRepo.create.mockReturnValue({
        academicYear: '2026',
        isLocked: true,
        finalizedAt: expect.any(Date),
        finalizedBy: null,
      } as any);
      recordRepo.save.mockResolvedValue({
        academicYear: '2026',
        isLocked: true,
        finalizedAt: new Date(),
        finalizedBy: null,
      } as any);

      const selectQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<TimetableEntryEntity>;
      entryRepo.createQueryBuilder.mockReturnValue(selectQb as any);

      await service.finalize({ academicYear: '2026' });

      expect(entryRepo.update).toHaveBeenCalledWith(
        { academicYear: '2026' },
        { status: TimetableEntryStatus.PUBLISHED },
      );
    });

    it('throws ConflictException and does not emit event when timetable is already finalized', async () => {
      recordRepo.findOne.mockResolvedValueOnce({
        id: 1,
        academicYear: '2026',
        isLocked: true,
        finalizedAt: new Date(),
        finalizedBy: null,
      } as TimetableRecordEntity);

      await expect(service.finalize({ academicYear: '2026' })).rejects.toThrow(ConflictException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
