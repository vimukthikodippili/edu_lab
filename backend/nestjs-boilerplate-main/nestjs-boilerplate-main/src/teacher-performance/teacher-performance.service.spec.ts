import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TeacherPerformanceService } from './teacher-performance.service';
import { StaffAttendanceEntity, StaffAttendanceStatus } from '../attendance/entities/staff-attendance.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { AnnualLessonPlanEntryEntity } from '../lesson-plan/entities/annual-lesson-plan-entry.entity';

const staffId = 'teacher-uuid';
const subjectId1 = 'subj-1';
const subjectId2 = 'subj-2';
const classSectionId1 = 10;
const classSectionId2 = 20;
const classSectionId3 = 30;
const classSectionId4 = 40;
const classSectionIdPrior = 11;
const currentYear = String(new Date().getFullYear());
const priorYear = String(Number(currentYear) - 1);

describe('TeacherPerformanceService', () => {
  let service: TeacherPerformanceService;

  let staffAttendanceRepo: { find: jest.Mock };
  let requirementRepo: { find: jest.Mock };
  let assessmentRepo: { find: jest.Mock };
  let markRepo: { find: jest.Mock };
  let subjectRepo: { find: jest.Mock };
  let classSectionRepo: { find: jest.Mock; findOne: jest.Mock };
  let entryRepo: { find: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    staffAttendanceRepo = { find: jest.fn().mockResolvedValue([]) };
    requirementRepo = { find: jest.fn().mockResolvedValue([]) };
    assessmentRepo = { find: jest.fn().mockResolvedValue([]) };
    markRepo = { find: jest.fn().mockResolvedValue([]) };
    subjectRepo = { find: jest.fn().mockResolvedValue([]) };
    classSectionRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) };
    entryRepo = { find: jest.fn().mockResolvedValue([]) };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'teacherPerformance.passMarkPercent') return 40;
        if (key === 'teacherPerformance.behindScheduleConsecutivePeriods') return 2;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherPerformanceService,
        { provide: getRepositoryToken(StaffAttendanceEntity), useValue: staffAttendanceRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(AnnualLessonPlanEntryEntity), useValue: entryRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TeacherPerformanceService>(TeacherPerformanceService);
  });

  describe('getMyPerformance — response shape', () => {
    it('returns exactly the three top-level sections and never a combined/single score field', async () => {
      const result = await service.getMyPerformance(staffId);
      expect(Object.keys(result).sort()).toEqual(['attendance', 'classResults', 'syllabus']);
    });
  });

  describe('attendance summary', () => {
    it('groups records by month and computes present/punctuality rates correctly', async () => {
      staffAttendanceRepo.find.mockResolvedValue([
        { staffId, date: new Date('2026-01-01'), status: StaffAttendanceStatus.PRESENT },
        { staffId, date: new Date('2026-01-02'), status: StaffAttendanceStatus.PRESENT },
        { staffId, date: new Date('2026-01-03'), status: StaffAttendanceStatus.LATE },
        { staffId, date: new Date('2026-01-04'), status: StaffAttendanceStatus.ABSENT },
        { staffId, date: new Date('2026-02-01'), status: StaffAttendanceStatus.PRESENT },
        { staffId, date: new Date('2026-02-02'), status: StaffAttendanceStatus.HALF_DAY },
        { staffId, date: new Date('2026-02-03'), status: StaffAttendanceStatus.ON_LEAVE },
      ]);

      const result = await service.getMyPerformance(staffId);

      expect(result.attendance.monthly).toHaveLength(2);
      const jan = result.attendance.monthly[0];
      expect(jan.month).toBe('2026-01');
      expect(jan.presentCount).toBe(2);
      expect(jan.absentCount).toBe(1);
      expect(jan.lateCount).toBe(1);
      expect(jan.totalMarkedDays).toBe(4);
      expect(jan.presentRate).toBeCloseTo(50, 5);
      expect(jan.punctualityRate).toBeCloseTo(75, 5);

      const feb = result.attendance.monthly[1];
      expect(feb.month).toBe('2026-02');
      expect(feb.presentCount).toBe(1);
      expect(feb.halfDayCount).toBe(1);
      expect(feb.onLeaveCount).toBe(1);
      expect(feb.totalMarkedDays).toBe(3);
      expect(feb.presentRate).toBeCloseTo(50, 5);
      expect(feb.punctualityRate).toBeCloseTo(100, 5);

      expect(result.attendance.overall.totalMarkedDays).toBe(7);
      expect(result.attendance.overall.punctualityRate).toBeCloseTo((6 / 7) * 100, 5);
    });

    it('returns an empty monthly series and zeroed overall when no attendance is recorded', async () => {
      const result = await service.getMyPerformance(staffId);
      expect(result.attendance.monthly).toEqual([]);
      expect(result.attendance.overall).toEqual({ totalMarkedDays: 0, presentRate: 0, punctualityRate: 0 });
    });
  });

  describe('class results', () => {
    beforeEach(() => {
      requirementRepo.find.mockResolvedValue([
        { teacherId: staffId, subjectId: subjectId1, classSectionId: classSectionId1, periodsPerWeek: 5 },
        { teacherId: staffId, subjectId: subjectId2, classSectionId: classSectionId2, periodsPerWeek: 3 },
      ]);
      subjectRepo.find.mockResolvedValue([
        { id: subjectId1, name: 'Mathematics' },
        { id: subjectId2, name: 'Science' },
      ]);
      classSectionRepo.find.mockResolvedValue([
        { id: classSectionId1, name: '9C' },
        { id: classSectionId2, name: '10A' },
      ]);
      assessmentRepo.find.mockImplementation(({ where }: { where: { subjectId: string; classSectionId: number } }) => {
        if (where.subjectId === subjectId1 && where.classSectionId === classSectionId1) {
          return Promise.resolve([
            { id: 'a1', subjectId: subjectId1, classSectionId: classSectionId1, totalMarks: 100 },
            { id: 'a2', subjectId: subjectId1, classSectionId: classSectionId1, totalMarks: 50 },
          ]);
        }
        if (where.subjectId === subjectId2 && where.classSectionId === classSectionId2) {
          return Promise.resolve([{ id: 'a3', subjectId: subjectId2, classSectionId: classSectionId2, totalMarks: 100 }]);
        }
        return Promise.resolve([]);
      });
      const allMarks = [
        { assessmentId: 'a1', score: '80', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a1', score: '30', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a2', score: '40', status: MarkStatus.SUBMITTED }, // 40/50 = 80%
        { assessmentId: 'a2', score: '5', status: MarkStatus.DRAFT }, // must be excluded
        { assessmentId: 'a3', score: '90', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a3', score: '20', status: MarkStatus.SUBMITTED },
      ];
      markRepo.find.mockImplementation(({ where }: { where: { assessmentId: { value: string[] } } }) => {
        const ids = where.assessmentId.value;
        return Promise.resolve(allMarks.filter((m) => ids.includes(m.assessmentId) && m.status === MarkStatus.SUBMITTED));
      });
    });

    it('computes pass rate (excluding DRAFT marks) and average mark percent per subject/class taught', async () => {
      const result = await service.getMyPerformance(staffId);

      expect(result.classResults).toHaveLength(2);

      const mathsRow = result.classResults[0];
      expect(mathsRow).toMatchObject({
        subjectId: subjectId1,
        subjectName: 'Mathematics',
        classSectionId: classSectionId1,
        classSectionName: '9C',
        assessmentsCount: 2,
        submittedMarksCount: 3,
      });
      // percentScores: 80, 30, 80 -> average 63.33, passRate (>=40): 2/3
      expect(mathsRow.averageMarkPercent).toBeCloseTo((80 + 30 + 80) / 3, 5);
      expect(mathsRow.passRate).toBeCloseTo((2 / 3) * 100, 5);

      const scienceRow = result.classResults[1];
      expect(scienceRow).toMatchObject({
        subjectId: subjectId2,
        subjectName: 'Science',
        classSectionId: classSectionId2,
        classSectionName: '10A',
        assessmentsCount: 1,
        submittedMarksCount: 2,
      });
      // percentScores: 90, 20 -> average 55, passRate (>=40): 1/2
      expect(scienceRow.averageMarkPercent).toBeCloseTo(55, 5);
      expect(scienceRow.passRate).toBeCloseTo(50, 5);
    });

    it('returns an empty array when the teacher has no subject/class assignments', async () => {
      requirementRepo.find.mockResolvedValue([]);
      const result = await service.getMyPerformance(staffId);
      expect(result.classResults).toEqual([]);
    });
  });

  describe('syllabus completion', () => {
    it('computes completion percent per subject and an overall roll-up', async () => {
      entryRepo.find.mockResolvedValue([
        { id: 'e1', staffId, isComplete: true, syllabusUnit: { subjectId: subjectId1, subject: { name: 'Mathematics' } } },
        { id: 'e2', staffId, isComplete: false, syllabusUnit: { subjectId: subjectId1, subject: { name: 'Mathematics' } } },
        { id: 'e3', staffId, isComplete: true, syllabusUnit: { subjectId: subjectId2, subject: { name: 'Science' } } },
      ]);

      const result = await service.getMyPerformance(staffId);

      expect(result.syllabus.bySubject).toEqual([
        { subjectId: subjectId1, subjectName: 'Mathematics', totalUnits: 2, completedUnits: 1, completionPercent: 50 },
        { subjectId: subjectId2, subjectName: 'Science', totalUnits: 1, completedUnits: 1, completionPercent: 100 },
      ]);
      expect(result.syllabus.overallCompletionPercent).toBeCloseTo((2 / 3) * 100, 5);
    });

    it('returns zeroed syllabus data when no lesson plan entries exist yet', async () => {
      const result = await service.getMyPerformance(staffId);
      expect(result.syllabus).toEqual({ bySubject: [], overallCompletionPercent: 0 });
    });
  });

  describe('computeMeanAndStdDev — pure outlier threshold math', () => {
    it('computes population mean and standard deviation across a group of values', () => {
      const { mean, stddev } = service.computeMeanAndStdDev([0, 100, 100]);
      expect(mean).toBeCloseTo(66.667, 2);
      expect(stddev).toBeCloseTo(47.14, 1);
    });

    it('returns stddev 0 for a single-value group (degenerate case, can never flag)', () => {
      const { mean, stddev } = service.computeMeanAndStdDev([55]);
      expect(mean).toBe(55);
      expect(stddev).toBe(0);
    });

    it('returns mean 0 and stddev 0 for an empty group', () => {
      expect(service.computeMeanAndStdDev([])).toEqual({ mean: 0, stddev: 0 });
    });
  });

  describe('isBelowPeerThreshold — pure outlier threshold math', () => {
    it('flags a value more than 1 standard deviation below the mean', () => {
      expect(service.isBelowPeerThreshold(0, 66.667, 47.14)).toBe(true);
    });

    it('does not flag a value within 1 standard deviation of the mean', () => {
      expect(service.isBelowPeerThreshold(100, 66.667, 47.14)).toBe(false);
    });

    it('never flags the sole member of a single-value group (value equals mean, stddev is 0)', () => {
      expect(service.isBelowPeerThreshold(55, 55, 0)).toBe(false);
    });
  });

  describe('computeBehindScheduleOutlier — pure outlier threshold logic', () => {
    const makeEntry = (plannedCompletionDate: string, isComplete: boolean) =>
      ({ plannedCompletionDate, isComplete }) as never;

    it('flags when the two most recent elapsed months are both overdue (trailing consecutive streak)', () => {
      const today = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
        return d.toISOString().slice(0, 7);
      };
      const entries = [
        makeEntry(`${monthKey(1)}-05`, false), // most recent elapsed month, overdue
        makeEntry(`${monthKey(2)}-05`, false), // month before that, also overdue
      ];
      expect(service.computeBehindScheduleOutlier(entries, 2)).toBe(true);
    });

    it('does not flag when the most recent elapsed month is clean, even if an older month was overdue', () => {
      const today = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
        return d.toISOString().slice(0, 7);
      };
      const entries = [
        makeEntry(`${monthKey(1)}-05`, true), // most recent elapsed month, completed on time -> clean
        makeEntry(`${monthKey(2)}-05`, false), // older month, overdue
      ];
      expect(service.computeBehindScheduleOutlier(entries, 2)).toBe(false);
    });

    it('does not flag when a zero-entry gap month sits between two overdue months (streak broken)', () => {
      const today = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
        return d.toISOString().slice(0, 7);
      };
      // offset 1 (most recent elapsed month) has no entries at all; offset 2 and 3 are both overdue
      // but are no longer "consecutive" once the gap at offset 1 is accounted for.
      const entries = [
        makeEntry(`${monthKey(2)}-05`, false),
        makeEntry(`${monthKey(3)}-05`, false),
      ];
      expect(service.computeBehindScheduleOutlier(entries, 2)).toBe(false);
    });

    it('does not flag when fewer than the configured number of consecutive months have any data', () => {
      const today = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
        return d.toISOString().slice(0, 7);
      };
      const entries = [makeEntry(`${monthKey(1)}-05`, false)];
      expect(service.computeBehindScheduleOutlier(entries, 2)).toBe(false);
    });

    it('excludes the current in-progress month from the streak entirely', () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const entries = [makeEntry(todayIso, false)];
      expect(service.computeBehindScheduleOutlier(entries, 1)).toBe(false);
    });
  });

  describe('getPerformanceForStaff — response shape', () => {
    it('returns exactly the four top-level sections and never a combined/single score field', async () => {
      const result = await service.getPerformanceForStaff(staffId);
      expect(Object.keys(result).sort()).toEqual(['attendance', 'behindScheduleOutlier', 'classResults', 'syllabus']);
    });
  });

  describe('getPerformanceForStaff — pass-rate outlier + prior-year context wiring', () => {
    beforeEach(() => {
      requirementRepo.find.mockImplementation(({ where }: { where: { teacherId?: string; subjectId?: string } }) => {
        if (where.teacherId !== undefined) {
          return Promise.resolve([{ teacherId: staffId, subjectId: subjectId1, classSectionId: classSectionId1 }]);
        }
        if (where.subjectId === subjectId1) {
          return Promise.resolve([
            { teacherId: staffId, subjectId: subjectId1, classSectionId: classSectionId1 },
            { teacherId: 'other-teacher-1', subjectId: subjectId1, classSectionId: classSectionId3 },
            { teacherId: 'other-teacher-2', subjectId: subjectId1, classSectionId: classSectionId4 },
          ]);
        }
        return Promise.resolve([]);
      });
      subjectRepo.find.mockResolvedValue([{ id: subjectId1, name: 'Mathematics' }]);
      classSectionRepo.find.mockImplementation(
        ({ where }: { where: { name?: string; gradeId?: number; academicYear?: string } }) => {
          if (where.name !== undefined) {
            if (where.name === '9C' && where.gradeId === 9 && where.academicYear === priorYear) {
              return Promise.resolve([{ id: classSectionIdPrior, name: '9C', gradeId: 9, academicYear: priorYear }]);
            }
            return Promise.resolve([]);
          }
          if (where.gradeId !== undefined) {
            return Promise.resolve([
              { id: classSectionId1, name: '9C', gradeId: 9 },
              { id: classSectionId3, name: '9X', gradeId: 9 },
              { id: classSectionId4, name: '9Y', gradeId: 9 },
            ]);
          }
          return Promise.resolve([{ id: classSectionId1, name: '9C', gradeId: 9 }]);
        },
      );
      classSectionRepo.findOne.mockResolvedValue({
        id: classSectionId1,
        name: '9C',
        gradeId: 9,
        academicYear: currentYear,
      });

      const assessmentsBySection: Record<number, { id: string; subjectId: string; classSectionId: number; totalMarks: number }[]> = {
        [classSectionId1]: [{ id: 'a-target', subjectId: subjectId1, classSectionId: classSectionId1, totalMarks: 100 }],
        [classSectionId3]: [{ id: 'a-peerA', subjectId: subjectId1, classSectionId: classSectionId3, totalMarks: 100 }],
        [classSectionId4]: [{ id: 'a-peerB', subjectId: subjectId1, classSectionId: classSectionId4, totalMarks: 100 }],
        [classSectionIdPrior]: [{ id: 'a-prior', subjectId: subjectId1, classSectionId: classSectionIdPrior, totalMarks: 100 }],
      };
      assessmentRepo.find.mockImplementation(({ where }: { where: { classSectionId: number } }) =>
        Promise.resolve(assessmentsBySection[where.classSectionId] ?? []),
      );

      const allMarks = [
        { assessmentId: 'a-target', score: '20', status: MarkStatus.SUBMITTED }, // fails 40% threshold -> passRate 0
        { assessmentId: 'a-peerA', score: '90', status: MarkStatus.SUBMITTED }, // passes -> passRate 100
        { assessmentId: 'a-peerB', score: '95', status: MarkStatus.SUBMITTED }, // passes -> passRate 100
        { assessmentId: 'a-prior', score: '70', status: MarkStatus.SUBMITTED }, // passes -> passRate 100
      ];
      markRepo.find.mockImplementation(({ where }: { where: { assessmentId: { value: string[] } } }) => {
        const ids = where.assessmentId.value;
        return Promise.resolve(allMarks.filter((m) => ids.includes(m.assessmentId)));
      });
    });

    it('flags a class result as a pass-rate outlier and attaches the prior-year average as context', async () => {
      const result = await service.getPerformanceForStaff(staffId);

      expect(result.classResults).toHaveLength(1);
      const row = result.classResults[0];
      expect(row.passRate).toBe(0);
      expect(row.isPassRateOutlier).toBe(true);
      expect(row.priorYearAveragePassRate).toBe(100);
    });

    it('does not compute prior-year context for rows that are not flagged as outliers', async () => {
      // Make the target section pass too, so it's no longer more than 1 stddev below its peers.
      const allMarks = [
        { assessmentId: 'a-target', score: '90', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a-peerA', score: '90', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a-peerB', score: '95', status: MarkStatus.SUBMITTED },
        { assessmentId: 'a-prior', score: '70', status: MarkStatus.SUBMITTED },
      ];
      markRepo.find.mockImplementation(({ where }: { where: { assessmentId: { value: string[] } } }) => {
        const ids = where.assessmentId.value;
        return Promise.resolve(allMarks.filter((m) => ids.includes(m.assessmentId)));
      });

      const result = await service.getPerformanceForStaff(staffId);

      expect(result.classResults[0].isPassRateOutlier).toBe(false);
      expect(result.classResults[0].priorYearAveragePassRate).toBeNull();
    });
  });

  describe('getPerformanceForStaff — behindScheduleOutlier wiring', () => {
    it('surfaces the teacher-level behind-schedule outlier flag computed from their syllabus entries', async () => {
      const today = new Date();
      const monthKey = (offset: number) => {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1));
        return d.toISOString().slice(0, 7);
      };
      entryRepo.find.mockResolvedValue([
        { id: 'e1', staffId, isComplete: false, plannedCompletionDate: `${monthKey(1)}-05`, syllabusUnit: { subjectId: subjectId1, subject: { name: 'Mathematics' } } },
        { id: 'e2', staffId, isComplete: false, plannedCompletionDate: `${monthKey(2)}-05`, syllabusUnit: { subjectId: subjectId1, subject: { name: 'Mathematics' } } },
      ]);

      const result = await service.getPerformanceForStaff(staffId);

      expect(result.behindScheduleOutlier).toBe(true);
    });

    it('is false when there is no consecutive behind-schedule streak', async () => {
      entryRepo.find.mockResolvedValue([]);
      const result = await service.getPerformanceForStaff(staffId);
      expect(result.behindScheduleOutlier).toBe(false);
    });
  });
});
