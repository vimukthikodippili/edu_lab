import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TeacherTasksService } from './teacher-tasks.service';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { LessonPlanService } from '../lesson-plan/lesson-plan.service';
import { ClassDiaryService } from '../class-diary/class-diary.service';
import { ExperimentLogService } from '../experiment-log/experiment-log.service';

const staffId = 'staff-uuid';

describe('TeacherTasksService', () => {
  let service: TeacherTasksService;

  let markRepo: { find: jest.Mock };
  let assessmentRepo: { find: jest.Mock };
  let requirementRepo: { find: jest.Mock };
  let timetableRepo: { findOne: jest.Mock };
  let lessonPlanService: { findEntries: jest.Mock };
  let classDiaryService: { getMissingEntriesForDate: jest.Mock };
  let experimentLogService: { getMissingLogsForDate: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    markRepo = { find: jest.fn().mockResolvedValue([]) };
    assessmentRepo = { find: jest.fn().mockResolvedValue([]) };
    requirementRepo = { find: jest.fn().mockResolvedValue([]) };
    timetableRepo = { findOne: jest.fn().mockResolvedValue(null) };
    lessonPlanService = { findEntries: jest.fn().mockResolvedValue([]) };
    classDiaryService = { getMissingEntriesForDate: jest.fn().mockResolvedValue([]) };
    experimentLogService = { getMissingLogsForDate: jest.fn().mockResolvedValue([]) };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, unknown> = {
          'freePeriod.schoolStartTime': '07:30',
          'freePeriod.periodDurationMinutes': 40,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherTasksService,
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableRepo },
        { provide: LessonPlanService, useValue: lessonPlanService },
        { provide: ClassDiaryService, useValue: classDiaryService },
        { provide: ExperimentLogService, useValue: experimentLogService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TeacherTasksService>(TeacherTasksService);
  });

  describe('getCurrentPeriod', () => {
    it('returns 0 before the configured school start time', () => {
      const now = new Date(2026, 0, 1, 7, 0); // 07:00, start is 07:30
      expect(service.getCurrentPeriod(now)).toBe(0);
    });

    it('returns 1 exactly at school start time', () => {
      const now = new Date(2026, 0, 1, 7, 30);
      expect(service.getCurrentPeriod(now)).toBe(1);
    });

    it('returns the correct later period number partway through the day', () => {
      const now = new Date(2026, 0, 1, 9, 0); // 90 min after 07:30 -> period 3
      expect(service.getCurrentPeriod(now)).toBe(3);
    });
  });

  describe('getFreePeriodStatus', () => {
    it('returns isFreePeriod: false and tasks: null when a TimetableEntry matches the current period', async () => {
      timetableRepo.findOne.mockResolvedValue({ id: 1, teacherId: staffId, day: 4, period: 1 });

      const result = await service.getFreePeriodStatus(staffId);

      expect(result.isFreePeriod).toBe(false);
      expect(result.tasks).toBeNull();
    });

    it('returns isFreePeriod: true with all three task categories populated when no matching entry exists', async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      requirementRepo.find.mockResolvedValue([
        { teacherId: staffId, subjectId: 'sub-1', classSectionId: 1 },
      ]);
      assessmentRepo.find.mockResolvedValue([
        { id: 'assess-1', title: 'Term Test', subject: { name: 'Maths' }, classSection: { name: '9A' } },
      ]);
      markRepo.find.mockResolvedValue([
        { assessmentId: 'assess-1', status: MarkStatus.DRAFT },
        { assessmentId: 'assess-1', status: MarkStatus.DRAFT },
      ]);
      lessonPlanService.findEntries.mockResolvedValue([
        {
          syllabusUnitId: 'unit-1', plannedCompletionDate: '2020-01-01', behindSchedule: true,
          syllabusUnit: { title: 'Fractions', subject: { name: 'Maths' }, grade: { name: 'Grade 9' } },
        },
      ]);
      classDiaryService.getMissingEntriesForDate.mockResolvedValue([
        { id: 5, teacherId: staffId, period: 2, subject: { name: 'Science' }, classSection: { name: '9A' } },
      ]);
      experimentLogService.getMissingLogsForDate.mockResolvedValue([
        { id: 'booking-1', teacherId: staffId, periodNumber: 3, subject: { name: 'Chemistry' }, classSection: { name: '10B' } },
      ]);

      const result = await service.getFreePeriodStatus(staffId);

      expect(result.isFreePeriod).toBe(true);
      expect(result.tasks?.ungradedMarks).toHaveLength(1);
      expect(result.tasks?.ungradedMarks[0].draftMarkCount).toBe(2);
      expect(result.tasks?.behindScheduleLessons).toHaveLength(1);
      expect(result.tasks?.missingDiaryEntries).toHaveLength(1);
      expect(result.tasks?.missingExperimentLogs).toHaveLength(1);
      expect(result.tasks?.missingExperimentLogs[0]).toEqual({
        labBookingId: 'booking-1',
        periodNumber: 3,
        subjectName: 'Chemistry',
        classSectionName: '10B',
      });
    });

    it('combines all three sources correctly when only some categories have pending items', async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      lessonPlanService.findEntries.mockResolvedValue([
        {
          syllabusUnitId: 'unit-1', plannedCompletionDate: '2020-01-01', behindSchedule: true,
          syllabusUnit: { title: 'Fractions', subject: { name: 'Maths' }, grade: { name: 'Grade 9' } },
        },
      ]);
      // requirementRepo/assessmentRepo/markRepo and classDiaryService stay empty (default mocks)

      const result = await service.getFreePeriodStatus(staffId);

      expect(result.tasks?.ungradedMarks).toEqual([]);
      expect(result.tasks?.behindScheduleLessons).toHaveLength(1);
      expect(result.tasks?.missingDiaryEntries).toEqual([]);
    });

    it("excludes another teacher's missing diary entries (per-staffId scoping)", async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      classDiaryService.getMissingEntriesForDate.mockResolvedValue([
        { id: 5, teacherId: staffId, period: 2, subject: { name: 'Science' }, classSection: { name: '9A' } },
        { id: 6, teacherId: 'someone-else', period: 3, subject: { name: 'History' }, classSection: { name: '9A' } },
      ]);

      const result = await service.getFreePeriodStatus(staffId);

      expect(result.tasks?.missingDiaryEntries).toHaveLength(1);
      expect(result.tasks?.missingDiaryEntries[0].timetableEntryId).toBe(5);
    });

    it("excludes another teacher's missing experiment logs (per-staffId scoping)", async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      experimentLogService.getMissingLogsForDate.mockResolvedValue([
        { id: 'booking-1', teacherId: staffId, periodNumber: 2, subject: { name: 'Chemistry' }, classSection: { name: '10B' } },
        { id: 'booking-2', teacherId: 'someone-else', periodNumber: 3, subject: { name: 'Biology' }, classSection: { name: '10B' } },
      ]);

      const result = await service.getFreePeriodStatus(staffId);

      expect(result.tasks?.missingExperimentLogs).toHaveLength(1);
      expect(result.tasks?.missingExperimentLogs[0].labBookingId).toBe('booking-1');
    });
  });
});
