import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSessionAttendanceEntity } from './entities/live-session-attendance.entity';
import { LiveSessionEntity } from './entities/live-session.entity';
import {
  AttendanceRecordEntity,
  AttendanceStatus,
} from '../attendance/entities/attendance-record.entity';

export interface LiveSessionAttendanceRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  joinedAt: Date;
  leftAt: Date | null;
  durationSeconds: number;
}

/** The span from first join to the most recent leave — not accumulated disjoint
 * watch-segments across a drop/rejoin. */
export function computeDurationSeconds(joinedAt: Date, leftAt: Date): number {
  return Math.max(0, Math.round((leftAt.getTime() - joinedAt.getTime()) / 1000));
}

@Injectable()
export class LiveAttendanceService {
  constructor(
    @InjectRepository(LiveSessionAttendanceEntity)
    private readonly attendanceRepo: Repository<LiveSessionAttendanceEntity>,

    @InjectRepository(LiveSessionEntity)
    private readonly liveSessionRepo: Repository<LiveSessionEntity>,

    @InjectRepository(AttendanceRecordEntity)
    private readonly dailyAttendanceRepo: Repository<AttendanceRecordEntity>,
  ) {}

  /** Fills in a PRESENT mark on the existing daily attendance model only if the
   * student has no record at all for that date yet — never overwrites an existing
   * mark (e.g. a teacher's earlier ABSENT stays ABSENT). */
  private async upsertDailyPresentIfUnmarked(
    studentId: string,
    classSectionId: number,
    date: Date,
    markedById: string,
  ): Promise<void> {
    const existing = await this.dailyAttendanceRepo.findOne({ where: { studentId, date } });
    if (existing) return;

    const record = this.dailyAttendanceRepo.create({
      studentId,
      classSectionId,
      date,
      status: AttendanceStatus.PRESENT,
      markedById,
      note: 'Auto-marked from live class join',
    });
    await this.dailyAttendanceRepo.save(record);
  }

  async recordJoin(
    liveSessionId: string,
    studentId: string,
  ): Promise<LiveSessionAttendanceEntity> {
    const session = await this.liveSessionRepo.findOne({ where: { id: liveSessionId } });
    if (!session) {
      throw new NotFoundException('Live session not found.');
    }

    const existing = await this.attendanceRepo.findOne({
      where: { liveSessionId, studentId },
    });
    if (existing) {
      // Already joined once this session (e.g. reconnect) — the original joinedAt stands.
      return existing;
    }

    const attendance = this.attendanceRepo.create({
      liveSessionId,
      studentId,
      joinedAt: new Date(),
    });
    const saved = await this.attendanceRepo.save(attendance);

    const sessionDate = new Date(session.scheduledAt);
    sessionDate.setHours(0, 0, 0, 0);
    await this.upsertDailyPresentIfUnmarked(
      studentId,
      session.classSectionId,
      sessionDate,
      session.createdByTeacherId,
    );

    return saved;
  }

  async recordLeave(
    liveSessionId: string,
    studentId: string,
  ): Promise<LiveSessionAttendanceEntity> {
    const attendance = await this.attendanceRepo.findOne({
      where: { liveSessionId, studentId },
    });
    if (!attendance) {
      throw new NotFoundException(
        'No join record found for this student in this live session.',
      );
    }

    attendance.leftAt = new Date();
    attendance.durationSeconds = computeDurationSeconds(attendance.joinedAt, attendance.leftAt);
    return this.attendanceRepo.save(attendance);
  }

  async findForSession(liveSessionId: string): Promise<LiveSessionAttendanceRow[]> {
    const rows = await this.attendanceRepo.find({
      where: { liveSessionId },
      relations: ['student'],
      order: { joinedAt: 'ASC' },
    });

    return rows.map((r) => ({
      studentId: r.studentId,
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      admissionNumber: r.student.admissionNumber,
      joinedAt: r.joinedAt,
      leftAt: r.leftAt,
      durationSeconds: r.durationSeconds,
    }));
  }
}
