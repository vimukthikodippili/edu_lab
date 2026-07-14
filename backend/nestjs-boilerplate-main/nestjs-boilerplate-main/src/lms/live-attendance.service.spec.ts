import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LiveAttendanceService, computeDurationSeconds } from './live-attendance.service';
import { LiveSessionAttendanceEntity } from './entities/live-session-attendance.entity';
import { LiveSessionEntity } from './entities/live-session.entity';
import {
  AttendanceRecordEntity,
  AttendanceStatus,
} from '../attendance/entities/attendance-record.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeSession = (overrides: Partial<LiveSessionEntity> = {}): LiveSessionEntity =>
  ({
    id: 'session-1',
    classSectionId: 1,
    subjectId: 'subject-1',
    scheduledAt: new Date('2026-08-01T09:00:00.000Z'),
    durationMinutes: 40,
    createdByTeacherId: 'teacher-1',
    ...overrides,
  } as LiveSessionEntity);

// ─── computeDurationSeconds — the explicitly-requested test ───────────────────

describe('computeDurationSeconds', () => {
  it('returns the whole-second span between joinedAt and leftAt', () => {
    const joinedAt = new Date('2026-08-01T09:00:00.000Z');
    const leftAt = new Date('2026-08-01T09:05:30.000Z');
    expect(computeDurationSeconds(joinedAt, leftAt)).toBe(330);
  });

  it('returns 0 when leftAt equals joinedAt', () => {
    const t = new Date('2026-08-01T09:00:00.000Z');
    expect(computeDurationSeconds(t, t)).toBe(0);
  });

  it('never returns a negative duration even if leftAt somehow precedes joinedAt', () => {
    const joinedAt = new Date('2026-08-01T09:05:00.000Z');
    const leftAt = new Date('2026-08-01T09:00:00.000Z');
    expect(computeDurationSeconds(joinedAt, leftAt)).toBe(0);
  });
});

// ─── LiveAttendanceService ─────────────────────────────────────────────────────

describe('LiveAttendanceService', () => {
  let service: LiveAttendanceService;
  let attendanceRepo: MockRepo<LiveSessionAttendanceEntity>;
  let liveSessionRepo: MockRepo<LiveSessionEntity>;
  let dailyAttendanceRepo: MockRepo<AttendanceRecordEntity>;

  beforeEach(async () => {
    attendanceRepo = repoMock<LiveSessionAttendanceEntity>();
    liveSessionRepo = repoMock<LiveSessionEntity>();
    dailyAttendanceRepo = repoMock<AttendanceRecordEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveAttendanceService,
        { provide: getRepositoryToken(LiveSessionAttendanceEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(LiveSessionEntity), useValue: liveSessionRepo },
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: dailyAttendanceRepo },
      ],
    }).compile();

    service = module.get<LiveAttendanceService>(LiveAttendanceService);
    jest.clearAllMocks();
  });

  describe('recordJoin', () => {
    it('throws NotFoundException for an unknown session', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(null);

      await expect(service.recordJoin('session-1', 'student-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a new attendance row with joinedAt set, and upserts a PRESENT daily record', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      attendanceRepo.findOne!.mockResolvedValue(null);
      attendanceRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'attendance-1' }));
      dailyAttendanceRepo.findOne!.mockResolvedValue(null);
      dailyAttendanceRepo.save!.mockResolvedValue({});

      const result = await service.recordJoin('session-1', 'student-1');

      expect(result.id).toBe('attendance-1');
      const created = (attendanceRepo.create as jest.Mock).mock.calls[0][0];
      expect(created.liveSessionId).toBe('session-1');
      expect(created.studentId).toBe('student-1');
      expect(created.joinedAt).toBeInstanceOf(Date);

      expect(dailyAttendanceRepo.save).toHaveBeenCalledTimes(1);
      const dailyRecord = (dailyAttendanceRepo.create as jest.Mock).mock.calls[0][0];
      expect(dailyRecord.status).toBe(AttendanceStatus.PRESENT);
      expect(dailyRecord.studentId).toBe('student-1');
      expect(dailyRecord.classSectionId).toBe(1);
      expect(dailyRecord.markedById).toBe('teacher-1');
    });

    it('is idempotent on a second join (reconnect) — no duplicate row, original joinedAt untouched', async () => {
      const originalJoinedAt = new Date('2026-08-01T09:01:00.000Z');
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      attendanceRepo.findOne!.mockResolvedValue({
        id: 'attendance-1',
        liveSessionId: 'session-1',
        studentId: 'student-1',
        joinedAt: originalJoinedAt,
        leftAt: null,
      });

      const result = await service.recordJoin('session-1', 'student-1');

      expect(result.joinedAt).toBe(originalJoinedAt);
      expect(attendanceRepo.save).not.toHaveBeenCalled();
      expect(attendanceRepo.create).not.toHaveBeenCalled();
    });

    it('does NOT overwrite an existing daily attendance record — e.g. an earlier ABSENT mark stays ABSENT', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      attendanceRepo.findOne!.mockResolvedValue(null);
      attendanceRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'attendance-1' }));
      dailyAttendanceRepo.findOne!.mockResolvedValue({
        id: 'existing-daily',
        studentId: 'student-1',
        status: AttendanceStatus.ABSENT,
      });

      await service.recordJoin('session-1', 'student-1');

      expect(dailyAttendanceRepo.save).not.toHaveBeenCalled();
      expect(dailyAttendanceRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('recordLeave', () => {
    it('throws NotFoundException when the student never joined this session', async () => {
      attendanceRepo.findOne!.mockResolvedValue(null);

      await expect(service.recordLeave('session-1', 'student-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets leftAt and computes durationSeconds correctly — the explicitly-requested duration-on-leave test', async () => {
      // Relative to the real clock (not a hardcoded date) so this test is robust regardless
      // of when it actually runs.
      const joinedAt = new Date(Date.now() - 5 * 60_000);
      attendanceRepo.findOne!.mockResolvedValue({
        id: 'attendance-1',
        liveSessionId: 'session-1',
        studentId: 'student-1',
        joinedAt,
        leftAt: null,
        durationSeconds: 0,
      });
      attendanceRepo.save!.mockImplementation((a) => Promise.resolve(a));

      const before = Date.now();
      const result = await service.recordLeave('session-1', 'student-1');
      const after = Date.now();

      expect(result.leftAt).toBeInstanceOf(Date);
      const elapsedMs = result.leftAt!.getTime() - joinedAt.getTime();
      expect(result.durationSeconds).toBe(Math.round(elapsedMs / 1000));
      expect(result.leftAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.leftAt!.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('findForSession', () => {
    it('returns the roster ordered by joinedAt with student names flattened in', async () => {
      attendanceRepo.find!.mockResolvedValue([
        {
          studentId: 'student-1',
          joinedAt: new Date('2026-08-01T09:00:00.000Z'),
          leftAt: null,
          durationSeconds: 0,
          student: { firstName: 'A', lastName: 'One', admissionNumber: 'A1' },
        },
      ]);

      const result = await service.findForSession('session-1');

      expect(attendanceRepo.find).toHaveBeenCalledWith({
        where: { liveSessionId: 'session-1' },
        relations: ['student'],
        order: { joinedAt: 'ASC' },
      });
      expect(result).toEqual([
        {
          studentId: 'student-1',
          firstName: 'A',
          lastName: 'One',
          admissionNumber: 'A1',
          joinedAt: new Date('2026-08-01T09:00:00.000Z'),
          leftAt: null,
          durationSeconds: 0,
        },
      ]);
    });
  });
});
