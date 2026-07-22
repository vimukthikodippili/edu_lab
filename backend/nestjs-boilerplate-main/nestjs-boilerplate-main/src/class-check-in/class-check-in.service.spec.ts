import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ClassCheckInService } from './class-check-in.service';
import {
  ClassCheckInEntity,
  ClassCheckInMethod,
} from './entities/class-check-in.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassRoomEntity } from '../class-rooms/entities/class-room.entity';
import { StudentEntity } from '../students/entities/student.entity';

const teacherId = 'staff-uuid';

// 2026-01-05 09:00 is a Monday (day=1), 90 min after the 07:30 school start -> period 3
const MONDAY_9AM = new Date(2026, 0, 5, 9, 0);

describe('ClassCheckInService', () => {
  let service: ClassCheckInService;

  let checkInRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let timetableRepo: { findOne: jest.Mock };
  let classRoomRepo: { findOne: jest.Mock };
  let studentRepo: { find: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    checkInRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'checkin-1', ...data })),
      find: jest.fn().mockResolvedValue([]),
    };
    timetableRepo = { findOne: jest.fn().mockResolvedValue(null) };
    classRoomRepo = { findOne: jest.fn().mockResolvedValue(null) };
    studentRepo = { find: jest.fn().mockResolvedValue([]) };
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
        ClassCheckInService,
        { provide: getRepositoryToken(ClassCheckInEntity), useValue: checkInRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableRepo },
        { provide: getRepositoryToken(ClassRoomEntity), useValue: classRoomRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ClassCheckInService>(ClassCheckInService);
    jest.useFakeTimers();
    jest.setSystemTime(MONDAY_9AM);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getCurrentPeriod', () => {
    it('returns 0 before the configured school start time', () => {
      const now = new Date(2026, 0, 5, 7, 0);
      expect(service.getCurrentPeriod(now)).toBe(0);
    });

    it('returns 1 exactly at school start time', () => {
      const now = new Date(2026, 0, 5, 7, 30);
      expect(service.getCurrentPeriod(now)).toBe(1);
    });

    it('returns the correct later period number partway through the day', () => {
      expect(service.getCurrentPeriod(MONDAY_9AM)).toBe(3);
    });
  });

  describe('getActiveEntryForTeacher', () => {
    it('returns null when there is no active period right now', async () => {
      jest.setSystemTime(new Date(2026, 0, 5, 7, 0)); // before school start
      const result = await service.getActiveEntryForTeacher(teacherId);
      expect(result).toBeNull();
      expect(timetableRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns null when the active period has no matching timetable entry (free period)', async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      const result = await service.getActiveEntryForTeacher(teacherId);
      expect(result).toBeNull();
      expect(timetableRepo.findOne).toHaveBeenCalledWith({
        where: { teacherId, day: 1, period: 3 },
      });
    });

    it('returns the entry with alreadyCheckedIn: false when no check-in row exists yet', async () => {
      timetableRepo.findOne.mockResolvedValue({ id: 10, teacherId, day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveEntryForTeacher(teacherId);

      expect(result?.entry.id).toBe(10);
      expect(result?.alreadyCheckedIn).toBe(false);
    });

    it('returns alreadyCheckedIn: true when a check-in row already exists for today', async () => {
      timetableRepo.findOne.mockResolvedValue({ id: 10, teacherId, day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue({
        id: 'checkin-1',
        timetableEntryId: 10,
        date: '2026-01-05',
      });

      const result = await service.getActiveEntryForTeacher(teacherId);

      expect(result?.alreadyCheckedIn).toBe(true);
    });
  });

  describe('getCurrentClassRoster', () => {
    it('returns a null timetableEntry and empty roster when there is no active period right now', async () => {
      jest.setSystemTime(new Date(2026, 0, 5, 7, 0)); // before school start
      const result = await service.getCurrentClassRoster(teacherId);
      expect(result).toEqual({ timetableEntry: null, students: [] });
      expect(studentRepo.find).not.toHaveBeenCalled();
    });

    it("returns the current period's roster with each student's medicalNotes", async () => {
      timetableRepo.findOne.mockResolvedValue({
        id: 10,
        teacherId,
        day: 1,
        period: 3,
        classSectionId: 27,
        subjectId: 'subject-uuid-1',
        subject: { name: 'Mathematics' },
        classSection: { name: '9C' },
      });
      checkInRepo.findOne.mockResolvedValue(null);
      studentRepo.find.mockResolvedValue([
        {
          id: 'student-1',
          firstName: 'A',
          lastName: 'One',
          admissionNumber: 'A1',
          medicalNotes: 'Severe peanut allergy.',
        },
        {
          id: 'student-2',
          firstName: 'B',
          lastName: 'Two',
          admissionNumber: 'A2',
          medicalNotes: null,
        },
      ]);

      const result = await service.getCurrentClassRoster(teacherId);

      expect(result.timetableEntry).toEqual({
        id: 10,
        period: 3,
        subjectId: 'subject-uuid-1',
        subjectName: 'Mathematics',
        classSectionId: 27,
        classSectionName: '9C',
      });
      expect(result.students).toHaveLength(2);
      expect(result.students[0].medicalNotes).toBe('Severe peanut allergy.');
      expect(result.students[1].medicalNotes).toBeNull();
    });

    it('scopes the roster query to the active period\'s own class section only', async () => {
      timetableRepo.findOne.mockResolvedValue({
        id: 10,
        teacherId,
        day: 1,
        period: 3,
        classSectionId: 27,
        subjectId: 'subject-uuid-1',
        subject: { name: 'Mathematics' },
        classSection: { name: '9C' },
      });

      await service.getCurrentClassRoster(teacherId);

      expect(studentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ classSectionId: 27 }) }),
      );
    });
  });

  describe('checkIn', () => {
    it('throws UnprocessableEntityException when there is no active period', async () => {
      jest.setSystemTime(new Date(2026, 0, 5, 7, 0));
      await expect(service.checkIn(teacherId)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('creates a check-in row with method pwa_tap on the happy path', async () => {
      timetableRepo.findOne.mockResolvedValue({ id: 10, teacherId, day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue(null);

      const result = await service.checkIn(teacherId);

      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timetableEntryId: 10,
          date: '2026-01-05',
          teacherId,
          method: ClassCheckInMethod.PWA_TAP,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ timetableEntryId: 10, method: ClassCheckInMethod.PWA_TAP }),
      );
    });

    it('duplicate-prevention: returns the existing row instead of creating a second one when already checked in', async () => {
      const existing = { id: 'checkin-1', timetableEntryId: 10, date: '2026-01-05' };
      timetableRepo.findOne.mockResolvedValue({ id: 10, teacherId, day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue(existing);

      const result = await service.checkIn(teacherId);

      expect(result).toBe(existing);
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });

    it('duplicate-prevention: on a unique-constraint violation from a racing second tap, returns the existing row instead of throwing', async () => {
      const existing = { id: 'checkin-1', timetableEntryId: 10, date: '2026-01-05' };
      timetableRepo.findOne.mockResolvedValue({ id: 10, teacherId, day: 1, period: 3 });
      checkInRepo.findOne
        .mockResolvedValueOnce(null) // getActiveEntryForTeacher's alreadyCheckedIn check
        .mockResolvedValueOnce(existing); // re-fetch after the constraint violation
      checkInRepo.save.mockRejectedValueOnce({ code: '23505' });

      const result = await service.checkIn(teacherId);

      expect(result).toBe(existing);
    });
  });

  describe('getActiveEntryForRoom', () => {
    it('returns null when there is no active period right now', async () => {
      jest.setSystemTime(new Date(2026, 0, 5, 7, 0)); // before school start
      const result = await service.getActiveEntryForRoom('Room 5');
      expect(result).toBeNull();
      expect(timetableRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no timetable entry matches this room for the current day+period', async () => {
      timetableRepo.findOne.mockResolvedValue(null);
      const result = await service.getActiveEntryForRoom('Room 5');
      expect(result).toBeNull();
      expect(timetableRepo.findOne).toHaveBeenCalledWith({
        where: { roomNumber: 'Room 5', day: 1, period: 3 },
      });
    });

    it('returns the matching entry when found', async () => {
      const entry = { id: 20, roomNumber: 'Room 5', day: 1, period: 3 };
      timetableRepo.findOne.mockResolvedValue(entry);

      const result = await service.getActiveEntryForRoom('Room 5');

      expect(result).toBe(entry);
    });
  });

  describe('checkInByRoom', () => {
    const roomId = 'room-uuid-1';

    it('throws NotFoundException when the room does not exist', async () => {
      classRoomRepo.findOne.mockResolvedValue(null);

      await expect(service.checkInByRoom(teacherId, roomId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws a friendly NotFoundException (not a 500) when there is no active class in this room right now', async () => {
      classRoomRepo.findOne.mockResolvedValue({ id: roomId, roomNumber: 'Room 5' });
      timetableRepo.findOne.mockResolvedValue(null);

      await expect(service.checkInByRoom(teacherId, roomId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a check-in row with method qr_scan on the happy path', async () => {
      classRoomRepo.findOne.mockResolvedValue({ id: roomId, roomNumber: 'Room 5' });
      timetableRepo.findOne.mockResolvedValue({ id: 30, roomNumber: 'Room 5', day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue(null);

      const result = await service.checkInByRoom(teacherId, roomId);

      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timetableEntryId: 30,
          date: '2026-01-05',
          teacherId,
          method: ClassCheckInMethod.QR_SCAN,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ timetableEntryId: 30, method: ClassCheckInMethod.QR_SCAN }),
      );
    });

    it('duplicate-prevention: returns the existing row instead of creating a second one', async () => {
      const existing = { id: 'checkin-2', timetableEntryId: 30, date: '2026-01-05' };
      classRoomRepo.findOne.mockResolvedValue({ id: roomId, roomNumber: 'Room 5' });
      timetableRepo.findOne.mockResolvedValue({ id: 30, roomNumber: 'Room 5', day: 1, period: 3 });
      checkInRepo.findOne.mockResolvedValue(existing);

      const result = await service.checkInByRoom(teacherId, roomId);

      expect(result).toBe(existing);
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('checkInFromLiveSession', () => {
    const classSectionId = 27;
    const subjectId = 'subject-uuid-1';

    it('returns null when there is no active period right now (never throws)', async () => {
      jest.setSystemTime(new Date(2026, 0, 5, 7, 0)); // before school start
      const result = await service.checkInFromLiveSession(classSectionId, subjectId, teacherId);
      expect(result).toBeNull();
      expect(timetableRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns null when no timetable entry matches this class/subject/teacher for the current day+period', async () => {
      timetableRepo.findOne.mockResolvedValue(null);

      const result = await service.checkInFromLiveSession(classSectionId, subjectId, teacherId);

      expect(result).toBeNull();
      expect(timetableRepo.findOne).toHaveBeenCalledWith({
        where: { classSectionId, subjectId, teacherId, day: 1, period: 3 },
      });
    });

    it('creates a check-in row with method live_session_auto on the happy path', async () => {
      timetableRepo.findOne.mockResolvedValue({
        id: 40,
        classSectionId,
        subjectId,
        teacherId,
        day: 1,
        period: 3,
      });
      checkInRepo.findOne.mockResolvedValue(null);

      const result = await service.checkInFromLiveSession(classSectionId, subjectId, teacherId);

      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timetableEntryId: 40,
          date: '2026-01-05',
          teacherId,
          method: ClassCheckInMethod.LIVE_SESSION_AUTO,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ timetableEntryId: 40, method: ClassCheckInMethod.LIVE_SESSION_AUTO }),
      );
    });

    it('idempotency: returns the existing row instead of creating a duplicate when a check-in already exists (e.g. the teacher had already tapped in)', async () => {
      const existing = { id: 'checkin-3', timetableEntryId: 40, date: '2026-01-05' };
      timetableRepo.findOne.mockResolvedValue({
        id: 40,
        classSectionId,
        subjectId,
        teacherId,
        day: 1,
        period: 3,
      });
      checkInRepo.findOne.mockResolvedValue(existing);

      const result = await service.checkInFromLiveSession(classSectionId, subjectId, teacherId);

      expect(result).toBe(existing);
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findForAudit', () => {
    it('queries with no where clause when no filters are given, ordered newest-first', async () => {
      await service.findForAudit({});

      expect(checkInRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { date: 'DESC', checkedInAt: 'DESC' },
      });
    });

    it('filters by teacherId alone', async () => {
      await service.findForAudit({ teacherId });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId } }),
      );
    });

    it('filters by classSectionId alone via the timetableEntry relation', async () => {
      await service.findForAudit({ classSectionId: 27 });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timetableEntry: { classSectionId: 27 } },
        }),
      );
    });

    it('filters by a date range when both dateFrom and dateTo are given', async () => {
      await service.findForAudit({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: Between('2026-01-01', '2026-01-31') },
        }),
      );
    });

    it('filters by dateFrom only as an open-ended lower bound', async () => {
      await service.findForAudit({ dateFrom: '2026-01-01' });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: MoreThanOrEqual('2026-01-01') },
        }),
      );
    });

    it('filters by dateTo only as an open-ended upper bound', async () => {
      await service.findForAudit({ dateTo: '2026-01-31' });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { date: LessThanOrEqual('2026-01-31') },
        }),
      );
    });

    it('combines teacherId, classSectionId, and a date range together', async () => {
      await service.findForAudit({
        teacherId,
        classSectionId: 27,
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(checkInRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            teacherId,
            timetableEntry: { classSectionId: 27 },
            date: Between('2026-01-01', '2026-01-31'),
          },
        }),
      );
    });

    it('returns an empty array when nothing matches', async () => {
      checkInRepo.find.mockResolvedValue([]);
      const result = await service.findForAudit({ teacherId: 'no-such-teacher' });
      expect(result).toEqual([]);
    });
  });
});
