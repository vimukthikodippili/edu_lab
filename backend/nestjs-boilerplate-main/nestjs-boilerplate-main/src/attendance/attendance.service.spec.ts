import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceService } from './attendance.service';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { GradeStage } from '../students/entities/grade.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeGrade = () => ({
  id: 1,
  level: 6,
  name: 'Grade 6',
  stage: GradeStage.JUNIOR_SECONDARY,
});

const makeSection = (): ClassSectionEntity =>
  ({ id: 1, name: 'A', academicYear: '2026', gradeId: 1, grade: makeGrade() } as ClassSectionEntity);

const makeCalendarConfig = (workingDaysPerWeek = 5) => ({
  id: 1,
  gradeStage: 'junior_secondary',
  workingDaysPerWeek,
  periodsPerDay: 8,
  totalWeeklySlots: workingDaysPerWeek * 8,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepo: jest.Mocked<Repository<AttendanceRecordEntity>>;
  let holidayRepo: jest.Mocked<Repository<SchoolHolidayEntity>>;
  let classSectionRepo: jest.Mocked<Repository<ClassSectionEntity>>;
  let calendarSvc: jest.Mocked<SchoolCalendarConfigService>;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>() as any;
    holidayRepo = repoMock<SchoolHolidayEntity>() as any;
    const studentRepo = repoMock<StudentEntity>() as any;
    classSectionRepo = repoMock<ClassSectionEntity>() as any;
    const requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>() as any;
    calendarSvc = { findByStage: jest.fn(), findAll: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(SchoolHolidayEntity), useValue: holidayRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: SchoolCalendarConfigService, useValue: calendarSvc },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('bulkMark', () => {
    it('saves all records on a valid weekday (Monday)', async () => {
      // 2026-06-29 = Monday
      const dto = {
        classSectionId: 1,
        date: '2026-06-29',
        defaultStatus: AttendanceStatus.PRESENT,
        entries: [
          { studentId: 'uuid-A', status: AttendanceStatus.PRESENT },
          { studentId: 'uuid-B', status: AttendanceStatus.PRESENT },
        ],
      };

      classSectionRepo.findOne.mockResolvedValue(makeSection());
      calendarSvc.findByStage.mockResolvedValue(makeCalendarConfig(5) as any);
      holidayRepo.findOne.mockResolvedValue(null);
      attendanceRepo.findBy.mockResolvedValue([]);
      attendanceRepo.create.mockImplementation((d) => d as AttendanceRecordEntity);
      attendanceRepo.save.mockResolvedValue(dto.entries as any);

      await service.bulkMark(dto as any, 'teacher-uuid');

      expect(attendanceRepo.save).toHaveBeenCalledTimes(1);
      const saved = (attendanceRepo.save as jest.Mock).mock.calls[0][0] as AttendanceRecordEntity[];
      expect(saved).toHaveLength(2);
      expect(saved.every((r) => r.status === AttendanceStatus.PRESENT)).toBe(true);
    });

    it('throws 422 on a holiday date without overrideReason', async () => {
      const dto = {
        classSectionId: 1,
        date: '2026-07-05',
        defaultStatus: AttendanceStatus.PRESENT,
        entries: [{ studentId: 'uuid-A', status: AttendanceStatus.PRESENT }],
        // no overrideReason
      };

      classSectionRepo.findOne.mockResolvedValue(makeSection());
      calendarSvc.findByStage.mockResolvedValue(makeCalendarConfig(5) as any);
      // 2026-07-05 is a Sunday — weekend block fires before holiday check
      // Use a Monday date but mock holiday to test holiday path
      const holidayDto = { ...dto, date: '2026-07-06' }; // Monday July 6
      holidayRepo.findOne.mockResolvedValue({
        id: 1,
        date: new Date('2026-07-06'),
        description: 'Term Break',
        createdAt: new Date(),
      } as SchoolHolidayEntity);

      await expect(service.bulkMark(holidayDto as any, 'teacher-uuid')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds on a holiday date when overrideReason is provided', async () => {
      const dto = {
        classSectionId: 1,
        date: '2026-07-06', // Monday — only holiday blocks it
        defaultStatus: AttendanceStatus.PRESENT,
        entries: [{ studentId: 'uuid-A', status: AttendanceStatus.PRESENT }],
        overrideReason: 'Special exam day',
      };

      classSectionRepo.findOne.mockResolvedValue(makeSection());
      calendarSvc.findByStage.mockResolvedValue(makeCalendarConfig(5) as any);
      holidayRepo.findOne.mockResolvedValue({
        id: 1,
        date: new Date('2026-07-06'),
        description: 'Term Break',
        createdAt: new Date(),
      } as SchoolHolidayEntity);
      attendanceRepo.findBy.mockResolvedValue([]);
      attendanceRepo.create.mockImplementation((d) => d as AttendanceRecordEntity);
      attendanceRepo.save.mockResolvedValue([] as any);

      await service.bulkMark(dto as any, 'teacher-uuid');

      expect(attendanceRepo.save).toHaveBeenCalledTimes(1);
      const saved = (attendanceRepo.save as jest.Mock).mock.calls[0][0] as AttendanceRecordEntity[];
      expect(saved[0].overrideReason).toBe('Special exam day');
    });
  });
});
