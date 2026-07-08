import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LessonPlanService } from './lesson-plan.service';
import { AnnualLessonPlanEntryEntity } from './entities/annual-lesson-plan-entry.entity';
import { AnnualLessonPlanSubmissionEntity } from './entities/annual-lesson-plan-submission.entity';
import { MonthEndSummaryEntity } from './entities/month-end-summary.entity';
import { TimetableRecordEntity } from '../timetable/entities/timetable-record.entity';
import { SyllabusUnitEntity } from '../syllabus/entities/syllabus-unit.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { NotificationService } from '../notification/notification.service';

const makeEntry = (
  overrides: Partial<AnnualLessonPlanEntryEntity> = {},
): AnnualLessonPlanEntryEntity =>
  ({
    id: 'entry-uuid',
    staffId: 'staff-uuid',
    syllabusUnitId: 'unit-uuid-1',
    academicYear: '2026',
    plannedCompletionDate: '2026-03-01',
    syllabusUnit: {} as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as AnnualLessonPlanEntryEntity;

const makeUnit = (id: string): Partial<SyllabusUnitEntity> => ({
  id,
  subjectId: 'sub-uuid',
  gradeId: 7,
  academicYear: '2026',
});

const makeSectionEntry = (overrides: {
  staffId: string;
  subjectId: string;
  subjectName: string;
  gradeId: number;
  gradeName: string;
  plannedCompletionDate: string;
  isComplete: boolean;
}): AnnualLessonPlanEntryEntity =>
  ({
    id: `entry-${overrides.staffId}-${overrides.subjectId}-${overrides.gradeId}-${Math.random()}`,
    staffId: overrides.staffId,
    syllabusUnitId: `unit-${Math.random()}`,
    academicYear: '2026',
    plannedCompletionDate: overrides.plannedCompletionDate,
    isComplete: overrides.isComplete,
    actualCompletionDate: overrides.isComplete ? '2026-01-01' : null,
    syllabusUnit: {
      subjectId: overrides.subjectId,
      gradeId: overrides.gradeId,
      subject: { name: overrides.subjectName },
      grade: { name: overrides.gradeName },
    } as never,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as AnnualLessonPlanEntryEntity;

const makeSectionUnit = (subjectId: string, gradeId: number): Partial<SyllabusUnitEntity> => ({
  subjectId,
  gradeId,
  academicYear: '2026',
});

describe('LessonPlanService', () => {
  let service: LessonPlanService;

  let entryRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  let submissionRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  let timetableRepo: { findOne: jest.Mock };
  let syllabusUnitRepo: { find: jest.Mock; count: jest.Mock };
  let staffRepo: { find: jest.Mock; findOne: jest.Mock };
  let monthEndSummaryRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let subjectRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let configService: { get: jest.Mock };

  const submitDto = {
    subjectId: 'sub-uuid',
    gradeId: 7,
    academicYear: '2026',
  };

  const staffId = 'staff-uuid';

  beforeEach(async () => {
    entryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({ id: 'saved-uuid', ...entity })),
    };

    submissionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({ id: 'sub-saved-uuid', ...entity })),
    };

    timetableRepo = { findOne: jest.fn().mockResolvedValue(null) };

    syllabusUnitRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    staffRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    monthEndSummaryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({ id: 'mes-saved-uuid', ...entity })),
    };

    subjectRepo = { find: jest.fn().mockResolvedValue([]) };

    userRepo = { find: jest.fn().mockResolvedValue([]) };

    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, unknown> = {
          'lessonPlan.reminderDaysBeforeDeadline': 7,
          'lessonPlan.planningDeadlineMonth': 3,
          'lessonPlan.planningDeadlineDay': 31,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonPlanService,
        { provide: getRepositoryToken(AnnualLessonPlanEntryEntity), useValue: entryRepo },
        { provide: getRepositoryToken(AnnualLessonPlanSubmissionEntity), useValue: submissionRepo },
        { provide: getRepositoryToken(TimetableRecordEntity), useValue: timetableRepo },
        { provide: getRepositoryToken(SyllabusUnitEntity), useValue: syllabusUnitRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(MonthEndSummaryEntity), useValue: monthEndSummaryRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: NotificationService, useValue: notificationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LessonPlanService>(LessonPlanService);
  });

  describe('submit', () => {
    it('throws UnprocessableEntityException when TimetableRecord has finalizedAt: null', async () => {
      timetableRepo.findOne.mockResolvedValue({
        academicYear: '2026',
        finalizedAt: null,
        isLocked: false,
      });

      await expect(service.submit(staffId, submitDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when TimetableRecord does not exist', async () => {
      timetableRepo.findOne.mockResolvedValue(null);

      await expect(service.submit(staffId, submitDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when some units have no entry', async () => {
      timetableRepo.findOne.mockResolvedValue({
        academicYear: '2026',
        finalizedAt: new Date('2026-01-10'),
        isLocked: true,
      });

      syllabusUnitRepo.find.mockResolvedValue([
        makeUnit('unit-uuid-1'),
        makeUnit('unit-uuid-2'),
        makeUnit('unit-uuid-3'),
      ]);

      // Only 2 of 3 units have an entry
      entryRepo.count.mockResolvedValue(2);

      await expect(service.submit(staffId, submitDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('sets isSubmitted: true when all gates pass', async () => {
      timetableRepo.findOne.mockResolvedValue({
        academicYear: '2026',
        finalizedAt: new Date('2026-01-10'),
        isLocked: true,
      });

      const units = [
        makeUnit('unit-uuid-1'),
        makeUnit('unit-uuid-2'),
      ];
      syllabusUnitRepo.find.mockResolvedValue(units);
      entryRepo.count.mockResolvedValue(2);
      submissionRepo.findOne.mockResolvedValue(null);
      submissionRepo.create.mockReturnValue({
        staffId,
        ...submitDto,
        isSubmitted: true,
        submittedAt: new Date(),
      });

      const result = await service.submit(staffId, submitDto);

      expect(submissionRepo.save).toHaveBeenCalled();
      expect(result.isSubmitted).toBe(true);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });
  });

  describe('upsertEntry', () => {
    const entryDto = {
      syllabusUnitId: 'unit-uuid-1',
      plannedCompletionDate: '2026-03-15',
      academicYear: '2026',
    };

    it('creates a new entry when none exists', async () => {
      entryRepo.findOne.mockResolvedValue(null);
      entryRepo.create.mockReturnValue({ ...entryDto, staffId });

      await service.upsertEntry(staffId, entryDto);

      expect(entryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ staffId, syllabusUnitId: entryDto.syllabusUnitId }),
      );
      expect(entryRepo.save).toHaveBeenCalled();
    });

    it('updates plannedCompletionDate when entry already exists', async () => {
      const existing = makeEntry({ plannedCompletionDate: '2026-02-01' });
      entryRepo.findOne.mockResolvedValue(existing);

      await service.upsertEntry(staffId, {
        ...entryDto,
        plannedCompletionDate: '2026-04-15',
      });

      expect(entryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ plannedCompletionDate: '2026-04-15' }),
      );
      expect(entryRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('computeBehindSchedule', () => {
    it('returns true when today > plannedCompletionDate and isComplete is false', () => {
      expect(service.computeBehindSchedule('2020-01-01', false)).toBe(true);
    });

    it('returns false when today < plannedCompletionDate and isComplete is false', () => {
      expect(service.computeBehindSchedule('2099-01-01', false)).toBe(false);
    });

    it('returns false when isComplete is true regardless of plannedCompletionDate', () => {
      expect(service.computeBehindSchedule('2020-01-01', true)).toBe(false);
    });
  });

  describe('markComplete', () => {
    const completeDto = {
      syllabusUnitId: 'unit-uuid-1',
      academicYear: '2026',
    };

    it('sets isComplete: true and actualCompletionDate when entry exists', async () => {
      const existing = makeEntry({ isComplete: false, actualCompletionDate: null } as never);
      entryRepo.findOne.mockResolvedValue(existing);

      const result = await service.markComplete(staffId, completeDto);

      expect(entryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isComplete: true }),
      );
      expect(result.isComplete).toBe(true);
      expect(result.actualCompletionDate).toBeTruthy();
      expect(result.behindSchedule).toBe(false);
    });

    it('throws NotFoundException when no entry exists for this unit', async () => {
      entryRepo.findOne.mockResolvedValue(null);

      await expect(service.markComplete(staffId, completeDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSectionSummary', () => {
    const teacherA = 'staff-a';
    const teacherB = 'staff-b';

    beforeEach(() => {
      staffRepo.find.mockResolvedValue([
        { id: teacherA, firstName: 'Amara', lastName: 'Silva' },
        { id: teacherB, firstName: 'Bimal', lastName: 'Perera' },
      ]);
    });

    it('groups entries correctly by (staffId, subjectId, gradeId)', async () => {
      entryRepo.find.mockResolvedValue([
        makeSectionEntry({
          staffId: teacherA, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
        makeSectionEntry({
          staffId: teacherA, subjectId: 'science', subjectName: 'Science',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
        makeSectionEntry({
          staffId: teacherB, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 8, gradeName: 'Grade 8', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
      ]);
      syllabusUnitRepo.find.mockResolvedValue([
        makeSectionUnit('maths', 9), makeSectionUnit('science', 9), makeSectionUnit('maths', 8),
      ]);

      const result = await service.getSectionSummary({ academicYear: '2026' });

      expect(result).toHaveLength(2);
      const amara = result.find((t) => t.staffId === teacherA);
      const bimal = result.find((t) => t.staffId === teacherB);
      expect(amara?.subjects).toHaveLength(2);
      expect(bimal?.subjects).toHaveLength(1);
      expect(bimal?.subjects[0].gradeId).toBe(8);
    });

    it('computes completionPercentage against total syllabus units, not just planned entries', async () => {
      entryRepo.find.mockResolvedValue([
        makeSectionEntry({
          staffId: teacherA, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2099-01-01', isComplete: true,
        }),
      ]);
      // 4 total syllabus units exist for maths/grade9, but teacher only has 1 entry (completed)
      syllabusUnitRepo.find.mockResolvedValue([
        makeSectionUnit('maths', 9), makeSectionUnit('maths', 9),
        makeSectionUnit('maths', 9), makeSectionUnit('maths', 9),
      ]);

      const result = await service.getSectionSummary({ academicYear: '2026' });

      const subject = result[0].subjects[0];
      expect(subject.totalUnits).toBe(4);
      expect(subject.completedUnits).toBe(1);
      expect(subject.completionPercentage).toBe(25);
    });

    it('flags behindSchedule: true when any entry in the group is overdue and incomplete', async () => {
      entryRepo.find.mockResolvedValue([
        makeSectionEntry({
          staffId: teacherA, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2020-01-01', isComplete: false,
        }),
        makeSectionEntry({
          staffId: teacherA, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
      ]);
      syllabusUnitRepo.find.mockResolvedValue([
        makeSectionUnit('maths', 9), makeSectionUnit('maths', 9),
      ]);

      const result = await service.getSectionSummary({ academicYear: '2026' });

      expect(result[0].subjects[0].behindSchedule).toBe(true);
    });

    it('excludes entries outside the gradeFrom/gradeTo filter when provided', async () => {
      entryRepo.find.mockResolvedValue([
        makeSectionEntry({
          staffId: teacherA, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 3, gradeName: 'Grade 3', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
        makeSectionEntry({
          staffId: teacherB, subjectId: 'maths', subjectName: 'Mathematics',
          gradeId: 9, gradeName: 'Grade 9', plannedCompletionDate: '2099-01-01', isComplete: false,
        }),
      ]);
      syllabusUnitRepo.find.mockResolvedValue([
        makeSectionUnit('maths', 3), makeSectionUnit('maths', 9),
      ]);

      const result = await service.getSectionSummary({
        academicYear: '2026', gradeFrom: 6, gradeTo: 9,
      });

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe(teacherB);
    });
  });

  describe('getMonthlyPlan', () => {
    it('includes an entry planned within the queried month with carriedForward: false', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ plannedCompletionDate: '2026-07-15', isComplete: false }),
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].carriedForward).toBe(false);
    });

    it('includes an incomplete entry planned in an earlier month with carriedForward: true', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ plannedCompletionDate: '2026-05-10', isComplete: false }),
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].carriedForward).toBe(true);
    });

    it('excludes an entry planned in an earlier month that is already complete', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ plannedCompletionDate: '2026-05-10', isComplete: true, actualCompletionDate: '2026-05-12' } as never),
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      expect(result.entries).toHaveLength(0);
    });

    it('excludes an entry planned in a later month', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ plannedCompletionDate: '2026-09-01', isComplete: false }),
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      expect(result.entries).toHaveLength(0);
    });

    it('does not leak entries across an academicYear boundary', async () => {
      // entryRepo.find is called with a where clause scoped to academicYear:'2026',
      // so a 2025 entry would never be returned by the real repository in the first place.
      // Simulate that by returning only entries matching the requested year.
      entryRepo.find.mockImplementation(async () => []);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 1,
      });

      expect(entryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { staffId, academicYear: '2026' } }),
      );
      expect(result.entries).toEqual([]);
    });

    it('separates native-month vs. carried-forward entries for clean percentage math', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ id: 'a', plannedCompletionDate: '2026-07-05', isComplete: true, actualCompletionDate: '2026-07-05' } as never),
        makeEntry({ id: 'b', plannedCompletionDate: '2026-07-20', isComplete: false }),
        makeEntry({ id: 'c', plannedCompletionDate: '2026-06-01', isComplete: false }),
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      const native = result.entries.filter((e) => !e.carriedForward);
      const carried = result.entries.filter((e) => e.carriedForward);
      expect(native).toHaveLength(2);
      expect(carried).toHaveLength(1);
      expect(carried[0].id).toBe('c');
    });

    it('computes monthCompletionPercent as completedThisMonth / totalDueThisMonth, excluding carried-forward entries', async () => {
      entryRepo.find.mockResolvedValue([
        makeEntry({ id: 'a', plannedCompletionDate: '2026-07-05', isComplete: true, actualCompletionDate: '2026-07-05' } as never),
        makeEntry({ id: 'b', plannedCompletionDate: '2026-07-20', isComplete: false }),
        makeEntry({ id: 'c', plannedCompletionDate: '2026-06-01', isComplete: false }), // carried-forward, excluded from denominator
      ]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      // 1 of 2 native (this-month) entries complete = 50%, regardless of the carried-forward entry
      expect(result.monthCompletionPercent).toBe(50);
    });

    it('returns monthCompletionPercent: 0 when there are no lessons due this month', async () => {
      entryRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlyPlan(staffId, {
        academicYear: '2026', month: 7,
      });

      expect(result.monthCompletionPercent).toBe(0);
    });
  });

  describe('generateMonthEndSummaries', () => {
    const makeMonthEndEntry = (overrides: {
      staffId: string;
      subjectId: string;
      gradeId: number;
      title: string;
      plannedCompletionDate: string;
      isComplete: boolean;
    }): AnnualLessonPlanEntryEntity =>
      ({
        id: `entry-${Math.random()}`,
        staffId: overrides.staffId,
        syllabusUnitId: `unit-${Math.random()}`,
        academicYear: '2026',
        plannedCompletionDate: overrides.plannedCompletionDate,
        isComplete: overrides.isComplete,
        actualCompletionDate: overrides.isComplete ? overrides.plannedCompletionDate : null,
        syllabusUnit: {
          subjectId: overrides.subjectId,
          gradeId: overrides.gradeId,
          title: overrides.title,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as AnnualLessonPlanEntryEntity;

    it('aggregates plannedCount/completedCount/incompleteItems per (staffId, subjectId) across complete, incomplete, and carried-forward lessons', async () => {
      entryRepo.find.mockResolvedValue([
        // Teacher A / Subject 1: 2 lessons due this month (1 complete, 1 not) + 1 carried-forward incomplete lesson
        makeMonthEndEntry({ staffId: 'teacher-a', subjectId: 'subject-1', gradeId: 9, title: 'Lesson 1', plannedCompletionDate: '2026-07-05', isComplete: true }),
        makeMonthEndEntry({ staffId: 'teacher-a', subjectId: 'subject-1', gradeId: 9, title: 'Lesson 2', plannedCompletionDate: '2026-07-20', isComplete: false }),
        makeMonthEndEntry({ staffId: 'teacher-a', subjectId: 'subject-1', gradeId: 9, title: 'Lesson 0 (carried)', plannedCompletionDate: '2026-06-01', isComplete: false }),
        // Teacher B / Subject 2: 1 lesson due this month, complete
        makeMonthEndEntry({ staffId: 'teacher-b', subjectId: 'subject-2', gradeId: 10, title: 'Lesson X', plannedCompletionDate: '2026-07-10', isComplete: true }),
      ]);

      await service.generateMonthEndSummaries('2026', 7);

      expect(monthEndSummaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'teacher-a',
          subjectId: 'subject-1',
          academicYear: '2026',
          month: 7,
          gradeId: 9,
          plannedCount: 2,
          completedCount: 1,
          incompleteItems: [
            { title: 'Lesson 2', plannedCompletionDate: '2026-07-20' },
            { title: 'Lesson 0 (carried)', plannedCompletionDate: '2026-06-01' },
          ],
        }),
      );
      expect(monthEndSummaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'teacher-b',
          subjectId: 'subject-2',
          plannedCount: 1,
          completedCount: 1,
          incompleteItems: [],
        }),
      );
    });

    it('notifies every principal/section_head staff member exactly once, and never a teacher-role staff member', async () => {
      entryRepo.find.mockResolvedValue([
        makeMonthEndEntry({ staffId: 'teacher-a', subjectId: 'subject-1', gradeId: 9, title: 'Lesson 1', plannedCompletionDate: '2026-07-05', isComplete: false }),
      ]);
      userRepo.find.mockResolvedValue([
        { id: 1, email: 'principal@sims.edu.lk', role: { id: RoleEnum.principal } },
        { id: 2, email: 'sectionhead@sims.edu.lk', role: { id: RoleEnum.section_head } },
      ]);
      staffRepo.findOne.mockImplementation(async ({ where }: { where: { email: string } }) => {
        if (where.email === 'principal@sims.edu.lk') return { id: 'staff-principal' };
        if (where.email === 'sectionhead@sims.edu.lk') return { id: 'staff-sectionhead' };
        return null;
      });

      await service.generateMonthEndSummaries('2026', 7);

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(2);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'staff-principal', expect.any(String), expect.stringContaining('July 2026'), 'month_end_summary',
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'staff-sectionhead', expect.any(String), expect.any(String), 'month_end_summary',
      );
      // Never called with a teacher's staffId — userRepo.find was only asked for principal/section_head roles.
      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ role: { id: RoleEnum.principal } }, { role: { id: RoleEnum.section_head } }],
        }),
      );
    });
  });

  describe('getMonthEndSummaries', () => {
    it('filters persisted rows by gradeFrom/gradeTo and groups them by teacher', async () => {
      monthEndSummaryRepo.find.mockResolvedValue([
        {
          staffId: 'teacher-a', subjectId: 'subject-1', gradeId: 9,
          academicYear: '2026', month: 7, plannedCount: 2, completedCount: 1,
          incompleteItems: [{ title: 'Lesson 2', plannedCompletionDate: '2026-07-20' }],
        },
        {
          staffId: 'teacher-b', subjectId: 'subject-2', gradeId: 12,
          academicYear: '2026', month: 7, plannedCount: 1, completedCount: 1,
          incompleteItems: [],
        },
      ]);
      subjectRepo.find.mockResolvedValue([{ id: 'subject-1', name: 'Mathematics' }]);
      staffRepo.find.mockResolvedValue([{ id: 'teacher-a', firstName: 'Ama', lastName: 'Silva' }]);

      const result = await service.getMonthEndSummaries({
        academicYear: '2026', month: 7, gradeFrom: 6, gradeTo: 9,
      });

      expect(result).toHaveLength(1);
      expect(result[0].staffId).toBe('teacher-a');
      expect(result[0].teacherName).toBe('Ama Silva');
      expect(result[0].subjects[0].subjectName).toBe('Mathematics');
      expect(result[0].subjects[0].plannedCount).toBe(2);
      expect(result[0].subjects[0].completedCount).toBe(1);
      expect(result[0].subjects[0].completionPercentage).toBe(50);
      expect(result[0].subjects[0].incompleteItems).toEqual([
        { title: 'Lesson 2', plannedCompletionDate: '2026-07-20' },
      ]);
    });
  });
});
