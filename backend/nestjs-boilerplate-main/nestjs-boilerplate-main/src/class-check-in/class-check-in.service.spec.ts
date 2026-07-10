import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ClassCheckInService } from './class-check-in.service';
import {
  ClassCheckInEntity,
  ClassCheckInMethod,
} from './entities/class-check-in.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassRoomEntity } from '../class-rooms/entities/class-room.entity';

const teacherId = 'staff-uuid';

// 2026-01-05 09:00 is a Monday (day=1), 90 min after the 07:30 school start -> period 3
const MONDAY_9AM = new Date(2026, 0, 5, 9, 0);

describe('ClassCheckInService', () => {
  let service: ClassCheckInService;

  let checkInRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let timetableRepo: { findOne: jest.Mock };
  let classRoomRepo: { findOne: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    checkInRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'checkin-1', ...data })),
    };
    timetableRepo = { findOne: jest.fn().mockResolvedValue(null) };
    classRoomRepo = { findOne: jest.fn().mockResolvedValue(null) };
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
});
