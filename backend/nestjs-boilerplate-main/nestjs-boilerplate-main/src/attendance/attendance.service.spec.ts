import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceService } from './attendance.service';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { LeaveRequestEntity, LeaveStatus } from '../leave/entities/leave-request.entity';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';

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
});

const makeSection = (): ClassSectionEntity =>
  ({ id: 1, name: 'A', academicYear: '2026', gradeId: 1, grade: makeGrade() } as ClassSectionEntity);

const makeCalendarConfig = (workingDaysPerWeek = 5) => ({
  id: 1,
  gradeStageId: 'stage-junior-secondary',
  gradeStage: { id: 'stage-junior-secondary', stageName: 'Junior Secondary', fromGrade: 6, toGrade: 9, ordering: 1 },
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
  let requirementRepo: jest.Mocked<Repository<TeacherSubjectClassRequirementEntity>>;
  let leaveRepo: jest.Mocked<Repository<LeaveRequestEntity>>;
  let calendarSvc: jest.Mocked<SchoolCalendarConfigService>;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>() as any;
    holidayRepo = repoMock<SchoolHolidayEntity>() as any;
    const studentRepo = repoMock<StudentEntity>() as any;
    classSectionRepo = repoMock<ClassSectionEntity>() as any;
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>() as any;
    leaveRepo = repoMock<LeaveRequestEntity>() as any;
    calendarSvc = { findByGradeLevel: jest.fn(), findAll: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(SchoolHolidayEntity), useValue: holidayRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(LeaveRequestEntity), useValue: leaveRepo },
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
      calendarSvc.findByGradeLevel.mockResolvedValue(makeCalendarConfig(5) as any);
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
      calendarSvc.findByGradeLevel.mockResolvedValue(makeCalendarConfig(5) as any);
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
      calendarSvc.findByGradeLevel.mockResolvedValue(makeCalendarConfig(5) as any);
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

  describe('attendance-marking authorization (class teacher gating)', () => {
    const MONDAY = '2026-06-29';
    const dto = {
      classSectionId: 1,
      date: MONDAY,
      defaultStatus: AttendanceStatus.PRESENT,
      entries: [{ studentId: 'uuid-A', status: AttendanceStatus.PRESENT }],
    };
    const sectionWithClassTeacher = (): ClassSectionEntity =>
      ({ ...makeSection(), classTeacherStaffId: 'class-teacher-uuid' }) as ClassSectionEntity;

    beforeEach(() => {
      calendarSvc.findByGradeLevel.mockResolvedValue(makeCalendarConfig(5) as any);
      holidayRepo.findOne.mockResolvedValue(null);
      attendanceRepo.findBy.mockResolvedValue([]);
      attendanceRepo.create.mockImplementation((d) => d as AttendanceRecordEntity);
      attendanceRepo.save.mockResolvedValue([] as any);
    });

    it('allows the assigned class teacher to mark their own section', async () => {
      classSectionRepo.findOne.mockResolvedValue(sectionWithClassTeacher());

      await service.bulkMark(dto as any, 'class-teacher-uuid');

      expect(attendanceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a teacher who neither is the class teacher nor teaches the section', async () => {
      classSectionRepo.findOne.mockResolvedValue(sectionWithClassTeacher());
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(service.bulkMark(dto as any, 'other-teacher-uuid')).rejects.toThrow(
        ForbiddenException,
      );
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a teacher who teaches the section but the class teacher is not on approved leave', async () => {
      classSectionRepo.findOne.mockResolvedValue(sectionWithClassTeacher());
      requirementRepo.findOne.mockResolvedValue({ id: 'req-1' } as unknown as TeacherSubjectClassRequirementEntity);
      leaveRepo.findOne.mockResolvedValue(null);

      await expect(service.bulkMark(dto as any, 'other-teacher-uuid')).rejects.toThrow(
        ForbiddenException,
      );
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('allows a teacher who teaches the section when the class teacher is on approved leave covering today', async () => {
      classSectionRepo.findOne.mockResolvedValue(sectionWithClassTeacher());
      requirementRepo.findOne.mockResolvedValue({ id: 'req-1' } as unknown as TeacherSubjectClassRequirementEntity);
      leaveRepo.findOne.mockResolvedValue({
        id: 'leave-1',
        staffId: 'class-teacher-uuid',
        status: LeaveStatus.APPROVED,
      } as LeaveRequestEntity);

      await service.bulkMark(dto as any, 'other-teacher-uuid');

      expect(attendanceRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
