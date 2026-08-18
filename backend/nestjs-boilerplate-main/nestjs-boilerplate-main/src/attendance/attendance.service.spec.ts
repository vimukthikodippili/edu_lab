import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttendanceService } from './attendance.service';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StaffAttendanceEntity, StaffAttendanceStatus } from './entities/staff-attendance.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { LeaveRequestEntity, LeaveStatus } from '../leave/entities/leave-request.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
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
  let staffAttendanceRepo: jest.Mocked<Repository<StaffAttendanceEntity>>;
  let staffRepo: jest.Mocked<Repository<StaffEntity>>;
  let calendarSvc: jest.Mocked<SchoolCalendarConfigService>;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>() as any;
    holidayRepo = repoMock<SchoolHolidayEntity>() as any;
    const studentRepo = repoMock<StudentEntity>() as any;
    classSectionRepo = repoMock<ClassSectionEntity>() as any;
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>() as any;
    leaveRepo = repoMock<LeaveRequestEntity>() as any;
    staffAttendanceRepo = repoMock<StaffAttendanceEntity>() as any;
    staffRepo = repoMock<StaffEntity>() as any;
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
        { provide: getRepositoryToken(StaffAttendanceEntity), useValue: staffAttendanceRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: SchoolCalendarConfigService, useValue: calendarSvc },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  describe('markMyAttendance', () => {
    it('creates a present record for today, self-marked, when none exists yet', async () => {
      staffAttendanceRepo.findOne.mockResolvedValue(null);
      staffAttendanceRepo.save.mockImplementation(async (r: any) => r);

      const result = await service.markMyAttendance('staff-1');

      expect(staffAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-1',
          status: StaffAttendanceStatus.PRESENT,
          markedById: 'staff-1',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ staffId: 'staff-1', status: StaffAttendanceStatus.PRESENT }),
      );
    });

    it('rejects a second check-in for the same day', async () => {
      staffAttendanceRepo.findOne.mockResolvedValue({ id: 'existing' } as StaffAttendanceEntity);

      await expect(service.markMyAttendance('staff-1')).rejects.toThrow(
        'You have already marked your attendance for today.',
      );
      expect(staffAttendanceRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getMyAttendanceToday', () => {
    it("returns the caller's own record for today when present", async () => {
      const record = { id: 'r1', staffId: 'staff-1' } as StaffAttendanceEntity;
      staffAttendanceRepo.findOne.mockResolvedValue(record);

      await expect(service.getMyAttendanceToday('staff-1')).resolves.toEqual(record);
    });

    it('returns null when nothing has been marked yet today', async () => {
      staffAttendanceRepo.findOne.mockResolvedValue(null);
      await expect(service.getMyAttendanceToday('staff-1')).resolves.toBeNull();
    });
  });

  describe('markStaffAttendance', () => {
    it('creates a new record when none exists for that staff/date', async () => {
      staffRepo.findOne.mockResolvedValue({ id: 'staff-2' } as StaffEntity);
      staffAttendanceRepo.findOne.mockResolvedValue(null);
      staffAttendanceRepo.save.mockImplementation(async (r: any) => r);

      const result = await service.markStaffAttendance(
        'staff-2',
        '2026-08-10',
        StaffAttendanceStatus.ABSENT,
        'admin-uuid',
      );

      expect(staffAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 'staff-2',
          status: StaffAttendanceStatus.ABSENT,
          markedById: 'admin-uuid',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ staffId: 'staff-2', status: StaffAttendanceStatus.ABSENT }),
      );
    });

    it('overwrites an existing record in place rather than rejecting on duplicate', async () => {
      staffRepo.findOne.mockResolvedValue({ id: 'staff-2' } as StaffEntity);
      const existing = {
        id: 'existing-1',
        staffId: 'staff-2',
        status: StaffAttendanceStatus.PRESENT,
        markedById: 'staff-2',
      } as StaffAttendanceEntity;
      staffAttendanceRepo.findOne.mockResolvedValue(existing);
      staffAttendanceRepo.save.mockImplementation(async (r: any) => r);

      const result = await service.markStaffAttendance(
        'staff-2',
        '2026-08-10',
        StaffAttendanceStatus.ON_LEAVE,
        'admin-uuid',
      );

      expect(staffAttendanceRepo.create).not.toHaveBeenCalled();
      expect(staffAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-1', status: StaffAttendanceStatus.ON_LEAVE, markedById: 'admin-uuid' }),
      );
      expect(result.status).toBe(StaffAttendanceStatus.ON_LEAVE);
    });

    it('throws when the target staff member does not exist', async () => {
      staffRepo.findOne.mockResolvedValue(null);

      await expect(
        service.markStaffAttendance('missing-staff', '2026-08-10', StaffAttendanceStatus.PRESENT, 'admin-uuid'),
      ).rejects.toThrow('Staff member not found.');
      expect(staffAttendanceRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getStaffAttendanceTrend', () => {
    const makeQueryBuilder = (rawRows: unknown[]) => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(rawRows),
      };
      return qb;
    };

    it('computes the present-like rate per bucket', async () => {
      const qb = makeQueryBuilder([
        { bucket: new Date('2026-08-01T00:00:00.000Z'), presentLikeCount: '3', totalCount: '4' },
        { bucket: new Date('2026-08-02T00:00:00.000Z'), presentLikeCount: '0', totalCount: '2' },
      ]);
      staffAttendanceRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.getStaffAttendanceTrend(
        'day' as any,
        '2026-08-01',
        '2026-08-31',
      );

      expect(result).toEqual([
        { bucket: '2026-08-01', presentLikeCount: 3, totalCount: 4, rate: 75 },
        { bucket: '2026-08-02', presentLikeCount: 0, totalCount: 2, rate: 0 },
      ]);
    });

    it('formats the bucket label per granularity (month/year)', async () => {
      const monthQb = makeQueryBuilder([
        { bucket: new Date('2026-08-01T00:00:00.000Z'), presentLikeCount: '1', totalCount: '1' },
      ]);
      staffAttendanceRepo.createQueryBuilder = jest.fn().mockReturnValue(monthQb);
      const monthResult = await service.getStaffAttendanceTrend('month' as any, '2026-01-01', '2026-12-31');
      expect(monthResult[0].bucket).toBe('2026-08');

      const yearQb = makeQueryBuilder([
        { bucket: new Date('2026-01-01T00:00:00.000Z'), presentLikeCount: '1', totalCount: '1' },
      ]);
      staffAttendanceRepo.createQueryBuilder = jest.fn().mockReturnValue(yearQb);
      const yearResult = await service.getStaffAttendanceTrend('year' as any, '2024-01-01', '2026-12-31');
      expect(yearResult[0].bucket).toBe('2026');
    });

    it('returns an empty array when nothing is in range', async () => {
      const qb = makeQueryBuilder([]);
      staffAttendanceRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.getStaffAttendanceTrend('day' as any, '2026-08-01', '2026-08-31');
      expect(result).toEqual([]);
    });
  });

  describe('getStaffDayAttendance', () => {
    const makeStaff = (overrides: Partial<StaffEntity> = {}): StaffEntity =>
      ({
        id: 'staff-1',
        firstName: 'Nimal',
        lastName: 'Perera',
        employeeNumber: 'EMP/2026/001',
        designation: 'Teacher',
        department: 'Science',
        status: StaffStatus.ACTIVE,
        ...overrides,
      }) as StaffEntity;

    it('marks an active staff member with no record for the date as status null', async () => {
      staffRepo.find.mockResolvedValue([makeStaff()]);
      staffAttendanceRepo.findBy.mockResolvedValue([]);

      const [row] = await service.getStaffDayAttendance('2026-08-18');

      expect(row).toEqual(
        expect.objectContaining({ staffId: 'staff-1', status: null, markedAt: null }),
      );
    });

    it("surfaces a matching day's record with its real status", async () => {
      staffRepo.find.mockResolvedValue([makeStaff()]);
      const updatedAt = new Date('2026-08-18T04:00:00.000Z');
      staffAttendanceRepo.findBy.mockResolvedValue([
        { staffId: 'staff-1', status: StaffAttendanceStatus.PRESENT, updatedAt } as StaffAttendanceEntity,
      ]);

      const [row] = await service.getStaffDayAttendance('2026-08-18');

      expect(row.status).toBe(StaffAttendanceStatus.PRESENT);
      expect(row.markedAt).toBe(updatedAt.toISOString());
    });

    it('only queries active staff — resigned/retired/on-leave staff are excluded at the repo level', async () => {
      staffAttendanceRepo.findBy.mockResolvedValue([]);
      staffRepo.find.mockResolvedValue([]);

      await service.getStaffDayAttendance('2026-08-18');

      expect(staffRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: StaffStatus.ACTIVE } }),
      );
    });
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
