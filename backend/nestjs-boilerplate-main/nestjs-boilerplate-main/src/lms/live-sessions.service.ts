import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { LiveSessionEntity, RecordingStatus } from './entities/live-session.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { LiveKitEgressService } from './livekit-egress.service';
import { LiveSessionStartedEvent } from './events/live-session-started.event';

export type SessionStatusValue = 'scheduled' | 'live' | 'ended';

export interface SessionAccess {
  status: SessionStatusValue;
  canJoin: boolean;
}

/**
 * The join link becomes active `joinWindowMinutes` before `scheduledAt` and stays
 * active until the session's scheduled end (`scheduledAt + durationMinutes`) — unless
 * the teacher ended it early, in which case `endedAt` always wins regardless of the
 * time window.
 */
export function computeSessionAccess(
  scheduledAt: Date,
  durationMinutes: number,
  now: Date,
  joinWindowMinutes: number,
  endedAt: Date | null = null,
): SessionAccess {
  if (endedAt) {
    return { status: 'ended', canJoin: false };
  }

  const joinOpensAt = new Date(scheduledAt.getTime() - joinWindowMinutes * 60_000);
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  if (now < joinOpensAt) {
    return { status: 'scheduled', canJoin: false };
  }
  if (now > endsAt) {
    return { status: 'ended', canJoin: false };
  }
  return { status: 'live', canJoin: true };
}

/**
 * A recording is only ever exposed to students once the session itself has ended AND
 * LiveKit's egress has finished uploading and reported back a file location — never while
 * still `'live'`, and never while `'ended'` but the file is still processing.
 */
export function computeRecordingAvailability(
  status: SessionStatusValue,
  recordingUrl: string | null,
): boolean {
  return status === 'ended' && recordingUrl !== null;
}

export interface LiveSessionWithAccess extends SessionAccess {
  id: string;
  classSectionId: number;
  subjectId: string;
  title: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  joinUrl: string | null;
  createdByTeacherId: string;
  endedAt: Date | null;
  recordingStatus: RecordingStatus;
  recordingUrl: string | null;
  recordingAvailable: boolean;
  whiteboardSnapshotUrl: string | null;
  whiteboardSnapshotPdfUrl: string | null;
  classSection: LiveSessionEntity['classSection'];
  subject: LiveSessionEntity['subject'];
  createdByTeacher: LiveSessionEntity['createdByTeacher'];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    @InjectRepository(LiveSessionEntity)
    private readonly liveSessionRepo: Repository<LiveSessionEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    private readonly liveKitEgressService: LiveKitEgressService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async assertAuthorized(
    subjectId: string,
    classSectionId: number,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;

    const requirement = await this.requirementRepo.findOne({
      where: { teacherId, subjectId, classSectionId },
    });
    if (!requirement) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  private annotate(
    sessions: LiveSessionEntity[],
    joinWindowMinutes: number,
    now: Date = new Date(),
  ): LiveSessionWithAccess[] {
    return sessions.map((s) => {
      const access = computeSessionAccess(
        s.scheduledAt,
        s.durationMinutes,
        now,
        joinWindowMinutes,
        s.endedAt,
      );
      const recordingAvailable = computeRecordingAvailability(access.status, s.recordingUrl);
      return {
        ...s,
        ...access,
        recordingAvailable,
        recordingUrl: recordingAvailable ? s.recordingUrl : null,
        whiteboardSnapshotUrl: s.whiteboardSnapshot?.path ?? null,
        whiteboardSnapshotPdfUrl: s.whiteboardSnapshotPdf?.path ?? null,
      };
    });
  }

  async create(
    dto: CreateLiveSessionDto,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<LiveSessionEntity> {
    await this.assertAuthorized(dto.subjectId, dto.classSectionId, teacherId, isPrivileged);

    const session = this.liveSessionRepo.create({
      classSectionId: dto.classSectionId,
      subjectId: dto.subjectId,
      title: dto.title ?? null,
      scheduledAt: new Date(dto.scheduledAt),
      durationMinutes: dto.durationMinutes ?? 40,
      joinUrl: dto.joinUrl ?? null,
      createdByTeacherId: teacherId,
    });

    return this.liveSessionRepo.save(session);
  }

  async findById(id: string): Promise<LiveSessionEntity> {
    const session = await this.liveSessionRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException('Live session not found.');
    }
    return session;
  }

  /** Authorizes a teacher to host/manage a session (creator/assigned/privileged), and
   * rejects if it has already been ended. */
  async assertCanHost(
    session: LiveSessionEntity,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    await this.assertAuthorized(session.subjectId, session.classSectionId, teacherId, isPrivileged);
    if (session.endedAt) {
      throw new UnprocessableEntityException('This live session has already ended.');
    }
  }

  /** Structural IDOR guard — a student may only join a session for their own class
   * section, and only within the join window (never trusts a client-supplied class). */
  assertCanJoinAsStudent(
    session: LiveSessionEntity,
    studentClassSectionId: number,
    joinWindowMinutes: number,
  ): void {
    if (session.classSectionId !== studentClassSectionId) {
      throw new ForbiddenException('This live session is not for your class section.');
    }
    const { canJoin } = computeSessionAccess(
      session.scheduledAt,
      session.durationMinutes,
      new Date(),
      joinWindowMinutes,
      session.endedAt,
    );
    if (!canJoin) {
      throw new UnprocessableEntityException(
        'This live session is not currently open to join.',
      );
    }
  }

  async endSession(
    id: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<LiveSessionEntity> {
    const session = await this.findById(id);
    await this.assertCanHost(session, teacherId, isPrivileged);

    session.endedAt = new Date();
    return this.liveSessionRepo.save(session);
  }

  async findForClassSection(
    classSectionId: number,
    joinWindowMinutes: number,
  ): Promise<LiveSessionWithAccess[]> {
    const sessions = await this.liveSessionRepo.find({
      where: { classSectionId },
      order: { scheduledAt: 'ASC' },
    });
    return this.annotate(sessions, joinWindowMinutes);
  }

  async findMine(
    teacherId: string,
    joinWindowMinutes: number,
  ): Promise<LiveSessionWithAccess[]> {
    const sessions = await this.liveSessionRepo.find({
      where: { createdByTeacherId: teacherId },
      order: { scheduledAt: 'DESC' },
    });
    return this.annotate(sessions, joinWindowMinutes);
  }

  /** Attaches the teacher's captured whiteboard image (required) and/or PDF (optional —
   * accepted alone if PDF generation failed client-side but the image succeeded) to the
   * session. Always called before endSession(), while the session is still live, since the
   * client can only capture the canvas while it's still connected/mounted. */
  async attachWhiteboardSnapshot(
    sessionId: string,
    fileIds: { imageFileId: string; pdfFileId?: string },
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<LiveSessionEntity> {
    const session = await this.findById(sessionId);
    await this.assertCanHost(session, teacherId, isPrivileged);

    const imageFile = await this.fileRepo.findOne({ where: { id: fileIds.imageFileId } });
    if (!imageFile) {
      throw new NotFoundException('Whiteboard image file not found.');
    }
    session.whiteboardSnapshotFileId = imageFile.id;

    if (fileIds.pdfFileId) {
      const pdfFile = await this.fileRepo.findOne({ where: { id: fileIds.pdfFileId } });
      if (!pdfFile) {
        throw new NotFoundException('Whiteboard PDF file not found.');
      }
      session.whiteboardSnapshotPdfFileId = pdfFile.id;
    }

    return this.liveSessionRepo.save(session);
  }

  /** Fire-and-forget notification that a live session has started — reacted to by the
   * class-check-in module (auto check-in) via a real event rather than a direct call, since
   * that module lives entirely outside src/lms/ and has no existing awareness of it. Emitted
   * on every successful host token mint, including reconnects — harmless, since the listener's
   * own check-in save is already idempotent at the DB level. */
  notifySessionStarted(session: LiveSessionEntity): void {
    this.eventEmitter.emit(
      'live_session.started',
      new LiveSessionStartedEvent(
        session.id,
        session.classSectionId,
        session.subjectId,
        session.createdByTeacherId,
      ),
    );
  }

  /** Best-effort side effect of the host's first token mint — never allowed to block
   * the teacher's own connection, so failures (e.g. egress storage not configured yet)
   * are logged and swallowed by the caller, not thrown from here. */
  async startRecordingFor(session: LiveSessionEntity): Promise<void> {
    if (session.egressId) return; // already started — a reconnect, not a fresh session
    const egressId = await this.liveKitEgressService.startRecording(session.id);
    await this.liveSessionRepo.update(session.id, {
      egressId,
      recordingStatus: RecordingStatus.RECORDING,
    });
  }

  /** Best-effort side effect of ending a session — never allowed to block the teacher's
   * end-session action. */
  async stopRecordingFor(session: LiveSessionEntity): Promise<void> {
    if (!session.egressId || session.recordingStatus !== RecordingStatus.RECORDING) return;
    await this.liveKitEgressService.stopRecording(session.egressId);
    await this.liveSessionRepo.update(session.id, {
      recordingStatus: RecordingStatus.PROCESSING,
    });
  }

  async reconcileRecordings(): Promise<void> {
    const processing = await this.liveSessionRepo.find({
      where: { recordingStatus: RecordingStatus.PROCESSING },
    });

    for (const session of processing) {
      if (!session.egressId) continue;
      try {
        const { status, url } = await this.liveKitEgressService.checkStatus(session.egressId);
        if (status === 'available') {
          await this.liveSessionRepo.update(session.id, {
            recordingUrl: url,
            recordingStatus: RecordingStatus.AVAILABLE,
          });
        } else if (status === 'failed') {
          await this.liveSessionRepo.update(session.id, {
            recordingStatus: RecordingStatus.FAILED,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to reconcile recording for session ${session.id}: ${message}`);
      }
    }
  }

  @Cron('*/2 * * * *')
  async runRecordingReconciliation(): Promise<void> {
    await this.reconcileRecordings();
  }
}
