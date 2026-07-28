import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { StudentEntity } from '../students/entities/student.entity';
import { AttendanceRecordEntity, AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { StudentGradeTrendEntity } from '../grades/entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity, AcademicPatternFlagType } from '../grades/entities/academic-pattern-flag.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';

const WINDOW_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AttendanceContextSummary {
  hasData: boolean;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  totalDaysRecorded: number;
  absentCount: number;
  absencePercent: number | null;
}

export interface GradeTrendContextRow {
  subjectId: string;
  subjectName: string;
  decliningTrend: boolean;
  lastComputedAt: Date | null;
}

export interface PatternFlagContextRow {
  id: string;
  subjectId: string;
  type: AcademicPatternFlagType;
  description: string;
  flaggedAt: Date;
}

export interface AcademicContextResponse {
  studentId: string;
  hasAnyData: boolean;
  attendance: AttendanceContextSummary;
  gradeTrends: GradeTrendContextRow[];
  patternFlags: PatternFlagContextRow[];
}

/** AC #15-18 — read-only academic risk context for the MHA session form's sidebar panel.
 * Deliberately reads AttendanceRecordEntity/StudentGradeTrendEntity/AcademicPatternFlagEntity
 * repos directly rather than via GradeTrendService (not exported from GradesModule, and its only
 * query method is class+subject scoped with a teacher-authorization check that doesn't apply
 * here). Every method below is find/findOne only — no write path exists in this service. */
@Injectable()
export class AcademicContextService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,

    @InjectRepository(StudentGradeTrendEntity)
    private readonly trendRepo: Repository<StudentGradeTrendEntity>,

    @InjectRepository(AcademicPatternFlagEntity)
    private readonly patternFlagRepo: Repository<AcademicPatternFlagEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
  ) {}

  async getAcademicContext(studentId: string): Promise<AcademicContextResponse> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }

    const [attendance, gradeTrends, patternFlags] = await Promise.all([
      this.buildAttendanceSummary(studentId),
      this.buildGradeTrends(studentId),
      this.buildPatternFlags(studentId),
    ]);

    const hasAnyData = attendance.hasData || gradeTrends.length > 0 || patternFlags.length > 0;

    return { studentId, hasAnyData, attendance, gradeTrends, patternFlags };
  }

  private async buildAttendanceSummary(studentId: string): Promise<AttendanceContextSummary> {
    const end = new Date();
    const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * MS_PER_DAY);
    const windowStart = start.toISOString().slice(0, 10);
    const windowEnd = end.toISOString().slice(0, 10);

    const records = await this.attendanceRepo.find({
      where: {
        studentId,
        date: Between(
          new Date(`${windowStart}T00:00:00.000Z`),
          new Date(`${windowEnd}T23:59:59.999Z`),
        ),
      },
    });

    const totalDaysRecorded = records.length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;

    return {
      hasData: totalDaysRecorded > 0,
      windowDays: WINDOW_DAYS,
      windowStart,
      windowEnd,
      totalDaysRecorded,
      absentCount,
      absencePercent: totalDaysRecorded > 0 ? Math.round((absentCount / totalDaysRecorded) * 100) : null,
    };
  }

  private async buildGradeTrends(studentId: string): Promise<GradeTrendContextRow[]> {
    const trends = await this.trendRepo.find({ where: { studentId } });
    if (!trends.length) return [];

    const subjectIds = [...new Set(trends.map((t) => t.subjectId))];
    const subjects = await this.subjectRepo.find({ where: { id: In(subjectIds) } });
    const nameById = new Map(subjects.map((s) => [s.id, s.name]));

    return trends
      .map((t) => ({
        subjectId: t.subjectId,
        subjectName: nameById.get(t.subjectId) ?? 'Unknown subject',
        decliningTrend: t.decliningTrend,
        lastComputedAt: t.lastComputedAt,
      }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }

  private async buildPatternFlags(studentId: string): Promise<PatternFlagContextRow[]> {
    const flags = await this.patternFlagRepo.find({
      where: { studentId },
      order: { flaggedAt: 'DESC' },
    });

    return flags.map((f) => ({
      id: f.id,
      subjectId: f.subjectId,
      type: f.type,
      description: f.description,
      flaggedAt: f.flaggedAt,
    }));
  }
}
