import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Between, In, Repository } from 'typeorm';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { StudentGradeTrendEntity } from '../entities/student-grade-trend.entity';
import {
  AcademicPatternFlagEntity,
  AcademicPatternFlagType,
} from '../entities/academic-pattern-flag.entity';
import {
  StudentEntity,
  StudentStatus,
} from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import {
  AttendanceRecordEntity,
  AttendanceStatus,
} from '../../attendance/entities/attendance-record.entity';
import { AllConfigType } from '../../config/config.type';
import { NotificationService } from '../../notification/notification.service';

export interface ScorePoint {
  assessmentId: string;
  assessmentTitle: string;
  scheduledDate: Date;
  percentScore: number;
}

export interface PatternFlagInfo {
  description: string;
  flaggedAt: Date;
}

export interface GradeTrendStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  decliningTrend: boolean;
  lastComputedAt: Date | null;
  series: ScorePoint[];
  attendanceGradeFlag: PatternFlagInfo | null;
  effortOutcomeMismatchFlag: PatternFlagInfo | null;
}

// A fixed, non-clinical description template — verified by a content test to never
// contain any of these substrings, regardless of the subject name interpolated in.
export const FORBIDDEN_CLINICAL_TERMS = [
  'depress',
  'anxi',
  'adhd',
  'add ',
  'odd',
  'disorder',
  'diagnos',
  'mental health',
  'psychiatr',
  'ptsd',
  'ocd',
  'bipolar',
  'autis',
];

export function buildPatternDescription(subjectName: string): string {
  return `This student's attendance and grades in ${subjectName} have both been declining over the same recent period. Consider a check-in.`;
}

export function buildEffortOutcomeMismatchMessage(subjectName: string): string {
  return `This student may benefit from extra support in ${subjectName}.`;
}

@Injectable()
export class GradeTrendService {
  private readonly logger = new Logger(GradeTrendService.name);

  constructor(
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,

    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,

    @InjectRepository(StudentGradeTrendEntity)
    private readonly trendRepo: Repository<StudentGradeTrendEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,

    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,

    @InjectRepository(AcademicPatternFlagEntity)
    private readonly patternFlagRepo: Repository<AcademicPatternFlagEntity>,

    private readonly configService: ConfigService<AllConfigType>,
    private readonly notificationService: NotificationService,
  ) {}

  computeRollingAverages(percentScores: number[], windowSize: number): number[] {
    if (percentScores.length < windowSize) return [];
    const result: number[] = [];
    for (let i = 0; i <= percentScores.length - windowSize; i++) {
      const window = percentScores.slice(i, i + windowSize);
      result.push(window.reduce((a, b) => a + b, 0) / windowSize);
    }
    return result;
  }

  isDecliningTrend(rollingAverages: number[], dropThreshold: number): boolean {
    if (rollingAverages.length < 3) return false;
    for (let i = 0; i <= rollingAverages.length - 3; i++) {
      const drop1 = rollingAverages[i] - rollingAverages[i + 1];
      const drop2 = rollingAverages[i + 1] - rollingAverages[i + 2];
      if (drop1 > dropThreshold && drop2 > dropThreshold) return true;
    }
    return false;
  }

  /** Exact mirror of isDecliningTrend() — two consecutive rises each exceeding the same
   * threshold magnitude, rather than a separate/asymmetric "improving" definition. */
  isImprovingTrend(rollingAverages: number[], riseThreshold: number): boolean {
    if (rollingAverages.length < 3) return false;
    for (let i = 0; i <= rollingAverages.length - 3; i++) {
      const rise1 = rollingAverages[i + 1] - rollingAverages[i];
      const rise2 = rollingAverages[i + 2] - rollingAverages[i + 1];
      if (rise1 > riseThreshold && rise2 > riseThreshold) return true;
    }
    return false;
  }

  private async getTermIdsForYear(academicYear: string): Promise<number[]> {
    const terms = await this.termRepo.find({ where: { academicYear } });
    return terms.map((t) => t.id);
  }

  async getScoreSeries(
    studentId: string,
    subjectId: string,
    academicYear: string,
  ): Promise<ScorePoint[]> {
    const termIds = await this.getTermIdsForYear(academicYear);
    if (!termIds.length) return [];

    const assessments = await this.assessmentRepo.find({
      where: { subjectId, termId: In(termIds) },
    });
    if (!assessments.length) return [];

    const assessmentById = new Map(assessments.map((a) => [a.id, a]));
    const marks = await this.markRepo.find({
      where: {
        studentId,
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });

    return marks
      .map((mark) => {
        const assessment = assessmentById.get(mark.assessmentId)!;
        return {
          assessmentId: assessment.id,
          assessmentTitle: assessment.title,
          // 'date'-typed Postgres columns arrive over the wire as raw strings, not parsed Date
          // objects — coerce here so every downstream .getTime() call is safe.
          scheduledDate: new Date(assessment.scheduledDate),
          percentScore: (Number(mark.score) / assessment.totalMarks) * 100,
        };
      })
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  private async isAttendanceDeclining(
    studentId: string,
    academicYear: string,
    windowSize: number,
    attendanceDropThreshold: number,
    cache: Map<string, boolean>,
  ): Promise<boolean> {
    if (cache.has(studentId)) return cache.get(studentId)!;

    const yearStart = new Date(`${academicYear}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${academicYear}-12-31T23:59:59Z`);
    const records = await this.attendanceRepo.find({
      where: { studentId, date: Between(yearStart, yearEnd) },
      order: { date: 'ASC' },
    });

    let declining = false;
    if (records.length >= windowSize + 2) {
      const attendedValues = records.map((r) =>
        r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
          ? 100
          : 0,
      );
      const rollingRates = this.computeRollingAverages(attendedValues, windowSize);
      declining = this.isDecliningTrend(rollingRates, attendanceDropThreshold);
    }

    cache.set(studentId, declining);
    return declining;
  }

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

  async getClassSubjectTrends(
    classSectionId: number,
    subjectId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<GradeTrendStudentRow[]> {
    await this.assertAuthorized(subjectId, classSectionId, teacherId, isPrivileged);

    const academicYear = String(new Date().getFullYear());

    const students = await this.studentRepo.find({
      where: { classSectionId, status: StudentStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    if (!students.length) return [];

    const trendRows = await this.trendRepo.find({
      where: { studentId: In(students.map((s) => s.id)), subjectId },
    });
    const trendByStudentId = new Map(trendRows.map((t) => [t.studentId, t]));

    const flagRows = await this.patternFlagRepo.find({
      where: { studentId: In(students.map((s) => s.id)), subjectId },
    });
    const correlationFlagByStudentId = new Map(
      flagRows
        .filter((f) => f.type === AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION)
        .map((f) => [f.studentId, f]),
    );
    const effortFlagByStudentId = new Map(
      flagRows
        .filter((f) => f.type === AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH)
        .map((f) => [f.studentId, f]),
    );

    return Promise.all(
      students.map(async (student) => {
        const series = await this.getScoreSeries(student.id, subjectId, academicYear);
        const trend = trendByStudentId.get(student.id);
        const correlationFlag = correlationFlagByStudentId.get(student.id);
        const effortFlag = effortFlagByStudentId.get(student.id);
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          decliningTrend: trend?.decliningTrend ?? false,
          lastComputedAt: trend?.lastComputedAt ?? null,
          series,
          attendanceGradeFlag: correlationFlag
            ? { description: correlationFlag.description, flaggedAt: correlationFlag.flaggedAt }
            : null,
          effortOutcomeMismatchFlag: effortFlag
            ? { description: effortFlag.description, flaggedAt: effortFlag.flaggedAt }
            : null,
        };
      }),
    );
  }

  @Cron('0 6 * * 1')
  async computeAllTrends(): Promise<void> {
    const windowSize = this.configService.get('gradeTrend.windowSize', {
      infer: true,
    }) as number;
    const dropThreshold = this.configService.get('gradeTrend.dropThreshold', {
      infer: true,
    }) as number;
    const attendanceDropThreshold = this.configService.get(
      'gradeTrend.attendanceDropThreshold',
      { infer: true },
    ) as number;

    const academicYear = String(new Date().getFullYear());
    const termIds = await this.getTermIdsForYear(academicYear);
    if (!termIds.length) return;

    const assessments = await this.assessmentRepo.find({
      where: { termId: In(termIds) },
    });
    if (!assessments.length) return;

    const assessmentById = new Map(assessments.map((a) => [a.id, a]));
    const marks = await this.markRepo.find({
      where: {
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });

    const groups = new Map<
      string,
      { studentId: string; subjectId: string; points: ScorePoint[] }
    >();

    for (const mark of marks) {
      const assessment = assessmentById.get(mark.assessmentId);
      if (!assessment) continue;

      const key = `${mark.studentId}::${assessment.subjectId}`;
      const group = groups.get(key) ?? {
        studentId: mark.studentId,
        subjectId: assessment.subjectId,
        points: [],
      };
      group.points.push({
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        // 'date'-typed Postgres columns arrive over the wire as raw strings, not parsed Date
        // objects — coerce here so every downstream .getTime() call is safe.
        scheduledDate: new Date(assessment.scheduledDate),
        percentScore: (Number(mark.score) / assessment.totalMarks) * 100,
      });
      groups.set(key, group);
    }

    const subjectIds = [...new Set([...groups.values()].map((g) => g.subjectId))];
    const subjects = subjectIds.length
      ? await this.subjectRepo.find({ where: { id: In(subjectIds) } })
      : [];
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

    const studentIds = [...new Set([...groups.values()].map((g) => g.studentId))];
    const studentsForClassLookup = studentIds.length
      ? await this.studentRepo.find({ where: { id: In(studentIds) } })
      : [];
    const classSectionIdByStudentId = new Map(
      studentsForClassLookup.map((s) => [s.id, s.classSectionId]),
    );

    const attendanceDecliningCache = new Map<string, boolean>();
    let computedCount = 0;
    let flaggedCount = 0;
    let effortFlaggedCount = 0;
    const rowsToSave: StudentGradeTrendEntity[] = [];

    for (const group of groups.values()) {
      if (group.points.length < windowSize + 2) continue;

      const sortedScores = [...group.points]
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
        .map((p) => p.percentScore);

      const rollingAverages = this.computeRollingAverages(sortedScores, windowSize);
      const declining = this.isDecliningTrend(rollingAverages, dropThreshold);
      const improving = this.isImprovingTrend(rollingAverages, dropThreshold);

      let row = await this.trendRepo.findOne({
        where: { studentId: group.studentId, subjectId: group.subjectId },
      });
      if (!row) {
        row = this.trendRepo.create({
          studentId: group.studentId,
          subjectId: group.subjectId,
        });
      }
      row.decliningTrend = declining;
      row.improvingTrend = improving;
      row.lastComputedAt = new Date();
      rowsToSave.push(row);
      computedCount++;

      const attendanceDeclining = await this.isAttendanceDeclining(
        group.studentId,
        academicYear,
        windowSize,
        attendanceDropThreshold,
        attendanceDecliningCache,
      );

      const existingFlag = await this.patternFlagRepo.findOne({
        where: {
          studentId: group.studentId,
          subjectId: group.subjectId,
          type: AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION,
        },
      });

      if (declining && attendanceDeclining) {
        const subjectName = subjectNameById.get(group.subjectId) ?? 'this subject';
        const flag =
          existingFlag ??
          this.patternFlagRepo.create({
            studentId: group.studentId,
            subjectId: group.subjectId,
            type: AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION,
          });
        flag.description = buildPatternDescription(subjectName);
        flag.flaggedAt = new Date();
        await this.patternFlagRepo.save(flag);
        flaggedCount++;
      } else if (existingFlag) {
        await this.patternFlagRepo.remove(existingFlag);
      }

      const existingEffortFlag = await this.patternFlagRepo.findOne({
        where: {
          studentId: group.studentId,
          subjectId: group.subjectId,
          type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
        },
      });

      if (declining && !attendanceDeclining) {
        const subjectName = subjectNameById.get(group.subjectId) ?? 'this subject';
        const isNewFlag = !existingEffortFlag;
        const flag =
          existingEffortFlag ??
          this.patternFlagRepo.create({
            studentId: group.studentId,
            subjectId: group.subjectId,
            type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
          });
        const message = buildEffortOutcomeMismatchMessage(subjectName);
        flag.description = message;
        flag.flaggedAt = new Date();
        await this.patternFlagRepo.save(flag);
        effortFlaggedCount++;

        if (isNewFlag) {
          const classSectionId = classSectionIdByStudentId.get(group.studentId);
          const requirements = classSectionId
            ? await this.requirementRepo.find({
                where: { subjectId: group.subjectId, classSectionId },
              })
            : [];
          await Promise.allSettled(
            requirements.map((r) =>
              this.notificationService.createForStaff(
                r.teacherId,
                'Student Support Suggestion',
                message,
                'effort_outcome_mismatch',
              ),
            ),
          );
        }
      } else if (existingEffortFlag) {
        await this.patternFlagRepo.remove(existingEffortFlag);
      }
    }

    if (rowsToSave.length) {
      await this.trendRepo.save(rowsToSave);
    }

    this.logger.log(
      `Computed grade trends for ${computedCount} student/subject pair(s), ` +
        `${flaggedCount} attendance-grade correlation flag(s), ` +
        `${effortFlaggedCount} effort-outcome mismatch flag(s) active.`,
    );
  }
}
