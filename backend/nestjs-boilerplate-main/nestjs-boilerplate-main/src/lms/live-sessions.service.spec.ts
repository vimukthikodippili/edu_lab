import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import {
  LiveSessionsService,
  computeSessionAccess,
  computeRecordingAvailability,
} from './live-sessions.service';
import { LiveSessionEntity, RecordingStatus } from './entities/live-session.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { LiveKitEgressService } from './livekit-egress.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeDto = (overrides: Partial<CreateLiveSessionDto> = {}): CreateLiveSessionDto => ({
  classSectionId: 1,
  subjectId: 'subject-1',
  scheduledAt: '2026-08-01T09:00:00.000Z',
  joinUrl: 'https://meet.google.com/abc-defg-hij',
  ...overrides,
});

// ─── computeSessionAccess — the explicitly-requested join-window test ─────────

describe('computeSessionAccess', () => {
  const scheduledAt = new Date('2026-08-01T09:00:00.000Z');
  const durationMinutes = 40;
  const joinWindowMinutes = 10;

  it('returns "scheduled" with canJoin false well before the join window opens', () => {
    const now = new Date('2026-08-01T08:00:00.000Z');
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes)).toEqual({
      status: 'scheduled',
      canJoin: false,
    });
  });

  it('returns "scheduled" one second before the join window opens (boundary)', () => {
    const now = new Date('2026-08-01T08:49:59.000Z'); // 10:01 before scheduledAt
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes).status).toBe(
      'scheduled',
    );
  });

  it('returns "live" with canJoin true exactly at the join-window boundary', () => {
    const now = new Date('2026-08-01T08:50:00.000Z'); // exactly 10 min before scheduledAt
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes)).toEqual({
      status: 'live',
      canJoin: true,
    });
  });

  it('returns "live" with canJoin true at the exact scheduled start time', () => {
    const now = scheduledAt;
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes)).toEqual({
      status: 'live',
      canJoin: true,
    });
  });

  it('returns "live" with canJoin true exactly at the scheduled end time (boundary)', () => {
    const now = new Date('2026-08-01T09:40:00.000Z'); // scheduledAt + 40 min
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes)).toEqual({
      status: 'live',
      canJoin: true,
    });
  });

  it('returns "ended" with canJoin false one second after the scheduled end time', () => {
    const now = new Date('2026-08-01T09:40:01.000Z');
    expect(computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes)).toEqual({
      status: 'ended',
      canJoin: false,
    });
  });

  it('returns "ended" when endedAt is set, even while otherwise still inside the live window', () => {
    const now = new Date('2026-08-01T09:10:00.000Z'); // would be "live" without endedAt
    const endedAt = new Date('2026-08-01T09:05:00.000Z'); // teacher ended it early
    expect(
      computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes, endedAt),
    ).toEqual({ status: 'ended', canJoin: false });
  });

  it('returns "ended" when endedAt is set even before the join window has opened', () => {
    const now = new Date('2026-08-01T08:00:00.000Z');
    const endedAt = new Date('2026-08-01T07:59:00.000Z');
    expect(
      computeSessionAccess(scheduledAt, durationMinutes, now, joinWindowMinutes, endedAt),
    ).toEqual({ status: 'ended', canJoin: false });
  });
});

// ─── computeRecordingAvailability — the explicitly-requested availability-gate test ──

describe('computeRecordingAvailability', () => {
  it('is false while the session is still live, regardless of recordingUrl', () => {
    expect(computeRecordingAvailability('live', null)).toBe(false);
    expect(computeRecordingAvailability('live', 'https://cdn.example.com/rec.mp4')).toBe(false);
  });

  it('is false while scheduled', () => {
    expect(computeRecordingAvailability('scheduled', null)).toBe(false);
  });

  it('is false once ended but the recording is still processing (no URL yet)', () => {
    expect(computeRecordingAvailability('ended', null)).toBe(false);
  });

  it('is true once ended and the recording URL is set', () => {
    expect(computeRecordingAvailability('ended', 'https://cdn.example.com/rec.mp4')).toBe(true);
  });
});

// ─── LiveSessionsService ─────────────────────────────────────────────────────

describe('LiveSessionsService', () => {
  let service: LiveSessionsService;
  let liveSessionRepo: MockRepo<LiveSessionEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let liveKitEgressService: Partial<Record<keyof LiveKitEgressService, jest.Mock>>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    liveSessionRepo = repoMock<LiveSessionEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    fileRepo = repoMock<FileEntity>();
    eventEmitter = { emit: jest.fn() };
    liveKitEgressService = {
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      checkStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        { provide: getRepositoryToken(LiveSessionEntity), useValue: liveSessionRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: LiveKitEgressService, useValue: liveKitEgressService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<LiveSessionsService>(LiveSessionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws ForbiddenException when the teacher is not assigned to teach this subject for this class section', async () => {
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(makeDto(), 'teacher-1', false)).rejects.toThrow(
        ForbiddenException,
      );
      expect(liveSessionRepo.save).not.toHaveBeenCalled();
    });

    it('creates a session with default 40-minute duration when none is given', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve({ ...s, id: 'session-1' }));

      const result = await service.create(makeDto(), 'teacher-1', false);

      expect(result.id).toBe('session-1');
      const saved = (liveSessionRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.durationMinutes).toBe(40);
      expect(saved.createdByTeacherId).toBe('teacher-1');
    });

    it('respects an explicit durationMinutes', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      await service.create(makeDto({ durationMinutes: 60 }), 'teacher-1', false);

      const saved = (liveSessionRepo.create as jest.Mock).mock.calls[0][0];
      expect(saved.durationMinutes).toBe(60);
    });

    it('allows a privileged actor to bypass the teach-assignment check', async () => {
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      await service.create(makeDto(), 'section-head-1', true);

      expect(requirementRepo.findOne).not.toHaveBeenCalled();
      expect(liveSessionRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findForClassSection', () => {
    it('orders sessions by scheduledAt ascending and annotates each with computed status', async () => {
      const past = new Date(Date.now() - 100 * 60_000);
      const future = new Date(Date.now() + 100 * 60_000);
      liveSessionRepo.find!.mockResolvedValue([
        { id: 's-1', scheduledAt: past, durationMinutes: 40 },
        { id: 's-2', scheduledAt: future, durationMinutes: 40 },
      ]);

      const result = await service.findForClassSection(1, 10);

      expect(liveSessionRepo.find).toHaveBeenCalledWith({
        where: { classSectionId: 1 },
        order: { scheduledAt: 'ASC' },
      });
      expect(result.find((r) => r.id === 's-1')?.status).toBe('ended');
      expect(result.find((r) => r.id === 's-2')?.status).toBe('scheduled');
    });
  });

  describe('findMine', () => {
    it("returns only the caller's own sessions, ordered by scheduledAt descending", async () => {
      liveSessionRepo.find!.mockResolvedValue([]);

      await service.findMine('teacher-1', 10);

      expect(liveSessionRepo.find).toHaveBeenCalledWith({
        where: { createdByTeacherId: 'teacher-1' },
        order: { scheduledAt: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('throws NotFoundException for an unknown session', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the session when found', async () => {
      liveSessionRepo.findOne!.mockResolvedValue({ id: 'session-1' });

      const result = await service.findById('session-1');

      expect(result.id).toBe('session-1');
    });
  });

  describe('assertCanHost', () => {
    const makeSession = (overrides: Partial<LiveSessionEntity> = {}): LiveSessionEntity =>
      ({
        id: 'session-1',
        subjectId: 'subject-1',
        classSectionId: 1,
        endedAt: null,
        ...overrides,
      } as LiveSessionEntity);

    it("throws ForbiddenException when the caller isn't assigned to teach this subject/class", async () => {
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(service.assertCanHost(makeSession(), 'teacher-1', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws UnprocessableEntityException when the session has already ended', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });

      await expect(
        service.assertCanHost(makeSession({ endedAt: new Date() }), 'teacher-1', false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows a privileged actor to bypass the teach-assignment check', async () => {
      await expect(
        service.assertCanHost(makeSession(), 'section-head-1', true),
      ).resolves.toBeUndefined();
      expect(requirementRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('assertCanJoinAsStudent', () => {
    const makeSession = (overrides: Partial<LiveSessionEntity> = {}): LiveSessionEntity =>
      ({
        id: 'session-1',
        classSectionId: 1,
        scheduledAt: new Date(Date.now() - 5 * 60_000), // started 5 minutes ago
        durationMinutes: 40,
        endedAt: null,
        ...overrides,
      } as LiveSessionEntity);

    it("throws ForbiddenException when the session is not for the student's own class section", () => {
      expect(() => service.assertCanJoinAsStudent(makeSession({ classSectionId: 1 }), 2, 10)).toThrow(
        ForbiddenException,
      );
    });

    it('throws UnprocessableEntityException when the session is not currently joinable', () => {
      const future = new Date(Date.now() + 100 * 60_000);
      expect(() =>
        service.assertCanJoinAsStudent(makeSession({ scheduledAt: future }), 1, 10),
      ).toThrow(UnprocessableEntityException);
    });

    it('does not throw when the session is live and for the correct class section', () => {
      expect(() => service.assertCanJoinAsStudent(makeSession(), 1, 10)).not.toThrow();
    });
  });

  describe('endSession', () => {
    it('throws NotFoundException for an unknown session', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(null);

      await expect(service.endSession('missing', 'teacher-1', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when the caller isn't authorized to host this session", async () => {
      liveSessionRepo.findOne!.mockResolvedValue({
        id: 'session-1',
        subjectId: 'subject-1',
        classSectionId: 1,
        endedAt: null,
      });
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(service.endSession('session-1', 'teacher-1', false)).rejects.toThrow(
        ForbiddenException,
      );
      expect(liveSessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when the session is already ended', async () => {
      liveSessionRepo.findOne!.mockResolvedValue({
        id: 'session-1',
        subjectId: 'subject-1',
        classSectionId: 1,
        endedAt: new Date(),
      });
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });

      await expect(service.endSession('session-1', 'teacher-1', false)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(liveSessionRepo.save).not.toHaveBeenCalled();
    });

    it('sets endedAt and saves when authorized and not already ended', async () => {
      const session = {
        id: 'session-1',
        subjectId: 'subject-1',
        classSectionId: 1,
        endedAt: null as Date | null,
      };
      liveSessionRepo.findOne!.mockResolvedValue(session);
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.endSession('session-1', 'teacher-1', false);

      expect(result.endedAt).toBeInstanceOf(Date);
      expect(liveSessionRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('attachWhiteboardSnapshot', () => {
    const makeSession = () => ({
      id: 'session-1',
      subjectId: 'subject-1',
      classSectionId: 1,
      endedAt: null as Date | null,
      whiteboardSnapshotFileId: null as string | null,
      whiteboardSnapshotPdfFileId: null as string | null,
    });

    it('sets both file ids when both are provided and valid', async () => {
      const session = makeSession();
      liveSessionRepo.findOne!.mockResolvedValue(session);
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findOne!.mockImplementation(({ where: { id } }: { where: { id: string } }) =>
        Promise.resolve({ id, path: `/uploads/${id}.bin` }),
      );
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.attachWhiteboardSnapshot(
        'session-1',
        { imageFileId: 'file-png', pdfFileId: 'file-pdf' },
        'teacher-1',
        false,
      );

      expect(result.whiteboardSnapshotFileId).toBe('file-png');
      expect(result.whiteboardSnapshotPdfFileId).toBe('file-pdf');
      expect(liveSessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('sets only the image file id when pdfFileId is omitted', async () => {
      const session = makeSession();
      liveSessionRepo.findOne!.mockResolvedValue(session);
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findOne!.mockResolvedValue({ id: 'file-png', path: '/uploads/file-png.png' });
      liveSessionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.attachWhiteboardSnapshot(
        'session-1',
        { imageFileId: 'file-png' },
        'teacher-1',
        false,
      );

      expect(result.whiteboardSnapshotFileId).toBe('file-png');
      expect(result.whiteboardSnapshotPdfFileId).toBeNull();
      expect(fileRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when the image file id does not resolve to a real file', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.attachWhiteboardSnapshot('session-1', { imageFileId: 'missing' }, 'teacher-1', false),
      ).rejects.toThrow(NotFoundException);
      expect(liveSessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the pdf file id does not resolve to a real file', async () => {
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findOne!
        .mockResolvedValueOnce({ id: 'file-png', path: '/uploads/file-png.png' })
        .mockResolvedValueOnce(null);

      await expect(
        service.attachWhiteboardSnapshot(
          'session-1',
          { imageFileId: 'file-png', pdfFileId: 'missing' },
          'teacher-1',
          false,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(liveSessionRepo.save).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when the caller isn't authorized to host this session", async () => {
      liveSessionRepo.findOne!.mockResolvedValue(makeSession());
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.attachWhiteboardSnapshot('session-1', { imageFileId: 'file-png' }, 'teacher-1', false),
      ).rejects.toThrow(ForbiddenException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('startRecordingFor', () => {
    const makeSession = (overrides: Partial<LiveSessionEntity> = {}): LiveSessionEntity =>
      ({
        id: 'session-1',
        egressId: null,
        recordingStatus: RecordingStatus.NOT_STARTED,
        ...overrides,
      } as LiveSessionEntity);

    it('starts egress and persists the egressId + recording status on first connect', async () => {
      liveKitEgressService.startRecording!.mockResolvedValue('egress-1');

      await service.startRecordingFor(makeSession());

      expect(liveKitEgressService.startRecording).toHaveBeenCalledWith('session-1');
      expect(liveSessionRepo.update).toHaveBeenCalledWith('session-1', {
        egressId: 'egress-1',
        recordingStatus: RecordingStatus.RECORDING,
      });
    });

    it('does nothing on a reconnect where an egressId already exists', async () => {
      await service.startRecordingFor(makeSession({ egressId: 'egress-existing' }));

      expect(liveKitEgressService.startRecording).not.toHaveBeenCalled();
      expect(liveSessionRepo.update).not.toHaveBeenCalled();
    });

    it('propagates a failure (e.g. egress storage unconfigured) for the caller to swallow', async () => {
      liveKitEgressService.startRecording!.mockRejectedValue(new Error('not configured'));

      await expect(service.startRecordingFor(makeSession())).rejects.toThrow('not configured');
      expect(liveSessionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('stopRecordingFor', () => {
    const makeSession = (overrides: Partial<LiveSessionEntity> = {}): LiveSessionEntity =>
      ({
        id: 'session-1',
        egressId: 'egress-1',
        recordingStatus: RecordingStatus.RECORDING,
        ...overrides,
      } as LiveSessionEntity);

    it('stops egress and moves status to processing when a recording was started', async () => {
      await service.stopRecordingFor(makeSession());

      expect(liveKitEgressService.stopRecording).toHaveBeenCalledWith('egress-1');
      expect(liveSessionRepo.update).toHaveBeenCalledWith('session-1', {
        recordingStatus: RecordingStatus.PROCESSING,
      });
    });

    it('does nothing when no recording was ever started', async () => {
      await service.stopRecordingFor(
        makeSession({ egressId: null, recordingStatus: RecordingStatus.NOT_STARTED }),
      );

      expect(liveKitEgressService.stopRecording).not.toHaveBeenCalled();
      expect(liveSessionRepo.update).not.toHaveBeenCalled();
    });

    it('does nothing when the recording has already moved past "recording" (e.g. already processing)', async () => {
      await service.stopRecordingFor(makeSession({ recordingStatus: RecordingStatus.PROCESSING }));

      expect(liveKitEgressService.stopRecording).not.toHaveBeenCalled();
      expect(liveSessionRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('reconcileRecordings', () => {
    it('marks a completed egress as available with its file URL', async () => {
      liveSessionRepo.find!.mockResolvedValue([
        { id: 'session-1', egressId: 'egress-1', recordingStatus: RecordingStatus.PROCESSING },
      ]);
      liveKitEgressService.checkStatus!.mockResolvedValue({
        status: 'available',
        url: 'https://cdn.example.com/rec.mp4',
      });

      await service.reconcileRecordings();

      expect(liveSessionRepo.update).toHaveBeenCalledWith('session-1', {
        recordingUrl: 'https://cdn.example.com/rec.mp4',
        recordingStatus: RecordingStatus.AVAILABLE,
      });
    });

    it('marks a failed egress as failed', async () => {
      liveSessionRepo.find!.mockResolvedValue([
        { id: 'session-1', egressId: 'egress-1', recordingStatus: RecordingStatus.PROCESSING },
      ]);
      liveKitEgressService.checkStatus!.mockResolvedValue({ status: 'failed', url: null });

      await service.reconcileRecordings();

      expect(liveSessionRepo.update).toHaveBeenCalledWith('session-1', {
        recordingStatus: RecordingStatus.FAILED,
      });
    });

    it('leaves a still-processing egress untouched', async () => {
      liveSessionRepo.find!.mockResolvedValue([
        { id: 'session-1', egressId: 'egress-1', recordingStatus: RecordingStatus.PROCESSING },
      ]);
      liveKitEgressService.checkStatus!.mockResolvedValue({ status: 'processing', url: null });

      await service.reconcileRecordings();

      expect(liveSessionRepo.update).not.toHaveBeenCalled();
    });

    it('does not let one session failing to check status stop the others from being reconciled', async () => {
      liveSessionRepo.find!.mockResolvedValue([
        { id: 'session-1', egressId: 'egress-1', recordingStatus: RecordingStatus.PROCESSING },
        { id: 'session-2', egressId: 'egress-2', recordingStatus: RecordingStatus.PROCESSING },
      ]);
      liveKitEgressService.checkStatus!
        .mockRejectedValueOnce(new Error('LiveKit unreachable'))
        .mockResolvedValueOnce({ status: 'available', url: 'https://cdn.example.com/rec2.mp4' });

      await service.reconcileRecordings();

      expect(liveSessionRepo.update).toHaveBeenCalledTimes(1);
      expect(liveSessionRepo.update).toHaveBeenCalledWith('session-2', {
        recordingUrl: 'https://cdn.example.com/rec2.mp4',
        recordingStatus: RecordingStatus.AVAILABLE,
      });
    });
  });

  describe('notifySessionStarted', () => {
    it('emits live_session.started with the session id, class/subject, and the owning teacher id', () => {
      const session = {
        id: 'session-1',
        classSectionId: 27,
        subjectId: 'subject-1',
        createdByTeacherId: 'teacher-1',
      } as LiveSessionEntity;

      service.notifySessionStarted(session);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'live_session.started',
        expect.objectContaining({
          sessionId: 'session-1',
          classSectionId: 27,
          subjectId: 'subject-1',
          teacherId: 'teacher-1',
        }),
      );
    });
  });
});
