import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { StudentEntity } from '../../students/entities/student.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import {
  AttendanceRecordEntity,
  AttendanceStatus,
} from '../../attendance/entities/attendance-record.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { StudentGradeTrendEntity } from '../entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity } from '../entities/academic-pattern-flag.entity';
import { TopicWeaknessService, TopicWeaknessRow } from './topic-weakness.service';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type RecentTrend = 'improving' | 'stable' | 'declining';

export interface AssessmentHistoryEntry {
  assessmentId: string;
  assessmentName: string;
  date: Date;
  studentMark: number;
  total: number;
  percentage: number;
  classRank: number;
  classAverage: number | null;
}

export interface TopicSummaryRow {
  topicName: string;
  averageScore: number;
  maxPossible: number;
  isWeak: boolean;
}

export interface SubjectSummaryRow {
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  thisTermAverage: number | null;
  allTimeAverage: number | null;
  assessmentCount: number;
  recentTrend: RecentTrend;
  classRankLatest: number | null;
  classSize: number | null;
  topicSummaries: TopicSummaryRow[];
  assessmentHistory: AssessmentHistoryEntry[];
}

export interface AttendanceMonthPoint {
  month: string; // "2026-01"
  rate: number;
}

export interface AttendanceSummaryRow {
  overallRate: number;
  thisTermRate: number;
  monthlyBreakdown: AttendanceMonthPoint[];
}

export interface AcademicFlagRow {
  type: string;
  description: string;
  subjectName: string;
  flaggedAt: Date;
}

export interface StudentSummaryResponse {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    grade: string;
    classSection: string;
    photoPath: string | null;
    stream: string | null;
  };
  termId: number;
  termName: string;
  attendanceSummary: AttendanceSummaryRow;
  subjectSummaries: SubjectSummaryRow[];
  academicFlags: AcademicFlagRow[];
  overallRank: number | null;
  overallAverage: number | null;
}

/** Composes many already-built grades-module (and adjacent) services/entities into one
 * consolidated view for a single student — no new source-of-truth data is invented here,
 * only new aggregation. See student-summary.service.spec.ts for the resilience behaviour
 * this deliberately implements: most students in this dev DB have no
 * StudentSubjectEnrollmentEntity row at all (that table is elective/A-L-stream-only, not a
 * comprehensive roster — confirmed this session), which means the precomputed
 * SubjectResultEntity/TermResultEntity pipeline (gated on that same enrollment table) silently
 * produces nothing for most students. Rather than depend on that gated pipeline as the sole
 * source of "which subjects does this student have," this service discovers subjects directly
 * from the student's own submitted marks, and falls back to computing an average directly from
 * marks whenever the precomputed aggregate is missing — always shows real data when real data
 * exists, never a false "no data" purely because of the enrollment gap. */
@Injectable()
export class StudentSummaryService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,
    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    @InjectRepository(StudentGradeTrendEntity)
    private readonly trendRepo: Repository<StudentGradeTrendEntity>,
    @InjectRepository(AcademicPatternFlagEntity)
    private readonly patternFlagRepo: Repository<AcademicPatternFlagEntity>,
    private readonly topicWeaknessService: TopicWeaknessService,
  ) {}

  private async resolveTargetTerm(termId?: number): Promise<AcademicTermEntity> {
    if (termId) {
      const term = await this.termRepo.findOne({ where: { id: termId } });
      if (!term) throw new NotFoundException(`Academic term ${termId} not found.`);
      return term;
    }
    const terms = await this.termRepo.find();
    if (terms.length === 0) {
      throw new NotFoundException('No academic terms are configured.');
    }
    const todayISO = new Date().toISOString().slice(0, 10);
    const current = terms.find(
      (t) => t.startDate.toString().slice(0, 10) <= todayISO && t.endDate.toString().slice(0, 10) >= todayISO,
    );
    if (current) return current;
    return [...terms].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
  }

  private async getAttendanceRate(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const total = await this.attendanceRepo.count({
      where: { studentId, date: Between(startDate, endDate) },
    });
    if (total === 0) return 0;
    const attended = await this.attendanceRepo.count({
      where: [
        { studentId, date: Between(startDate, endDate), status: AttendanceStatus.PRESENT },
        { studentId, date: Between(startDate, endDate), status: AttendanceStatus.LATE },
      ],
    });
    return Math.round((attended / total) * 100);
  }

  private async getMonthlyAttendanceBreakdown(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceMonthPoint[]> {
    const records = await this.attendanceRepo.find({
      where: { studentId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });
    const byMonth = new Map<string, { total: number; attended: number }>();
    for (const record of records) {
      const month = record.date.toString().slice(0, 7); // "YYYY-MM"
      const bucket = byMonth.get(month) ?? { total: 0, attended: 0 };
      bucket.total += 1;
      if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE) {
        bucket.attended += 1;
      }
      byMonth.set(month, bucket);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { total, attended }]) => ({
        month,
        rate: total > 0 ? Math.round((attended / total) * 100) : 0,
      }));
  }

  /** Precomputed SubjectResultEntity average across all terms when it exists (fast path);
   * falls back to computing directly from all-time submitted marks otherwise. */
  private async computeAllTimeAverage(
    studentId: string,
    subjectId: string,
  ): Promise<number | null> {
    const subjectResults = await this.subjectResultRepo.find({ where: { studentId, subjectId } });
    const precomputed = subjectResults
      .filter((sr) => sr.percentage !== null)
      .map((sr) => Number(sr.percentage));
    if (precomputed.length > 0) {
      return round2(precomputed.reduce((a, b) => a + b, 0) / precomputed.length);
    }

    const assessments = await this.assessmentRepo.find({ where: { subjectId } });
    if (assessments.length === 0) return null;
    const marks = await this.markRepo.find({
      where: {
        studentId,
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });
    if (marks.length === 0) return null;
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));
    const percentages = marks.map(
      (m) => (Number(m.score) / assessmentById.get(m.assessmentId)!.totalMarks) * 100,
    );
    return round2(percentages.reduce((a, b) => a + b, 0) / percentages.length);
  }

  /** New computation — no per-assessment class rank/average existed anywhere before this.
   * Two queries total regardless of assessment count: all assessments for this subject+term+
   * class, then every student's marks for those exact assessment ids in one batch. */
  private async buildAssessmentHistory(
    studentId: string,
    subjectId: string,
    termId: number,
    classSectionId: number,
  ): Promise<AssessmentHistoryEntry[]> {
    const assessments = await this.assessmentRepo.find({
      where: { subjectId, termId, classSectionId },
      order: { scheduledDate: 'ASC' },
    });
    if (assessments.length === 0) return [];

    const allMarks = await this.markRepo.find({
      where: { assessmentId: In(assessments.map((a) => a.id)), status: MarkStatus.SUBMITTED },
    });
    const marksByAssessment = new Map<string, MarkEntity[]>();
    for (const mark of allMarks) {
      const list = marksByAssessment.get(mark.assessmentId) ?? [];
      list.push(mark);
      marksByAssessment.set(mark.assessmentId, list);
    }

    const entries: AssessmentHistoryEntry[] = [];
    for (const assessment of assessments) {
      const cohort = marksByAssessment.get(assessment.id) ?? [];
      const studentMark = cohort.find((m) => m.studentId === studentId);
      if (!studentMark) continue; // no submitted mark yet for this student on this assessment

      // Dense rank by score descending, ties share a rank (same convention as class-wide rank).
      const sorted = [...cohort].sort((a, b) => Number(b.score) - Number(a.score));
      let rank = 0;
      let previousScore: string | null = null;
      let seen = 0;
      let studentRank = 0;
      for (const m of sorted) {
        seen += 1;
        if (previousScore === null || m.score !== previousScore) {
          rank = seen;
          previousScore = m.score;
        }
        if (m.id === studentMark.id) studentRank = rank;
      }

      const classAverage =
        cohort.length > 0
          ? round2(cohort.reduce((sum, m) => sum + Number(m.score), 0) / cohort.length)
          : null;

      entries.push({
        assessmentId: assessment.id,
        assessmentName: assessment.title,
        date: assessment.scheduledDate,
        studentMark: Number(studentMark.score),
        total: assessment.totalMarks,
        percentage: round2((Number(studentMark.score) / assessment.totalMarks) * 100),
        classRank: studentRank,
        classAverage,
      });
    }
    return entries;
  }

  async getStudentSummary(
    studentId: string,
    termId?: number,
  ): Promise<StudentSummaryResponse> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found.`);

    const term = await this.resolveTargetTerm(termId);
    const academicYear = term.academicYear;
    const yearStart = new Date(`${academicYear}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${academicYear}-12-31T23:59:59Z`);
    const termStart = new Date(term.startDate);
    const termEnd = new Date(term.endDate);

    // Discover subjects directly from this student's own submitted marks this term — not from
    // StudentSubjectEnrollmentEntity, which is elective-only and empty for most real students.
    const termAssessments = await this.assessmentRepo.find({
      where: { termId: term.id, classSectionId: student.classSectionId },
    });
    const termAssessmentById = new Map(termAssessments.map((a) => [a.id, a]));
    const studentMarksThisTerm = termAssessments.length
      ? await this.markRepo.find({
          where: {
            studentId,
            assessmentId: In(termAssessments.map((a) => a.id)),
            status: MarkStatus.SUBMITTED,
          },
        })
      : [];
    const subjectIds = [
      ...new Set(
        studentMarksThisTerm.map((m) => termAssessmentById.get(m.assessmentId)!.subjectId),
      ),
    ];

    const subjects = subjectIds.length
      ? await this.subjectRepo.find({ where: { id: In(subjectIds) } })
      : [];
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

    const subjectSummaries: SubjectSummaryRow[] = [];
    for (const subjectId of subjectIds) {
      const marksForSubjectThisTerm = studentMarksThisTerm.filter(
        (m) => termAssessmentById.get(m.assessmentId)!.subjectId === subjectId,
      );

      const [subjectResult, requirement, trend, topicRows, assessmentHistory, allTimeAverage] =
        await Promise.all([
          this.subjectResultRepo.findOne({ where: { studentId, subjectId, termId: term.id } }),
          this.requirementRepo.findOne({
            where: { subjectId, classSectionId: student.classSectionId },
          }),
          this.trendRepo.findOne({ where: { studentId, subjectId } }),
          this.topicWeaknessService.getForStudent(studentId, subjectId, studentId, true) as Promise<TopicWeaknessRow[]>,
          this.buildAssessmentHistory(studentId, subjectId, term.id, student.classSectionId),
          this.computeAllTimeAverage(studentId, subjectId),
        ]);

      let thisTermAverage: number | null;
      let subjectRank: number | null = null;
      let classSize: number | null = null;
      if (subjectResult?.percentage != null) {
        thisTermAverage = Number(subjectResult.percentage);
        subjectRank = subjectResult.subjectRank;
        classSize = await this.subjectResultRepo.count({
          where: { subjectId, classSectionId: student.classSectionId, termId: term.id },
        });
      } else if (marksForSubjectThisTerm.length > 0) {
        const percentages = marksForSubjectThisTerm.map(
          (m) => (Number(m.score) / termAssessmentById.get(m.assessmentId)!.totalMarks) * 100,
        );
        thisTermAverage = round2(percentages.reduce((a, b) => a + b, 0) / percentages.length);
      } else {
        thisTermAverage = null;
      }

      const recentTrend: RecentTrend = trend?.decliningTrend
        ? 'declining'
        : trend?.improvingTrend
          ? 'improving'
          : 'stable';

      subjectSummaries.push({
        subjectId,
        subjectName: subjectNameById.get(subjectId) ?? 'Unknown subject',
        teacherName: requirement
          ? `${requirement.teacher.firstName} ${requirement.teacher.lastName}`
          : null,
        thisTermAverage,
        allTimeAverage,
        assessmentCount: marksForSubjectThisTerm.length,
        recentTrend,
        classRankLatest: subjectRank,
        classSize,
        topicSummaries: topicRows.map((t) => ({
          topicName: t.title,
          averageScore: t.studentAverage,
          maxPossible: 100,
          isWeak: t.isWeak,
        })),
        assessmentHistory,
      });
    }

    const [overallRate, thisTermRate, monthlyBreakdown, academicFlagRows, termResult] =
      await Promise.all([
        this.getAttendanceRate(studentId, yearStart, yearEnd),
        this.getAttendanceRate(studentId, termStart, termEnd),
        this.getMonthlyAttendanceBreakdown(studentId, yearStart, yearEnd),
        this.patternFlagRepo.find({ where: { studentId } }),
        this.termResultRepo.findOne({ where: { studentId, termId: term.id } }),
      ]);

    const flagSubjectIds = [...new Set(academicFlagRows.map((f) => f.subjectId))];
    const flagSubjects = flagSubjectIds.length
      ? await this.subjectRepo.find({ where: { id: In(flagSubjectIds) } })
      : [];
    const flagSubjectNameById = new Map(flagSubjects.map((s) => [s.id, s.name]));

    return {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        grade: student.grade.name,
        classSection: student.classSection.name,
        photoPath: student.photo?.path ?? null,
        stream: student.stream?.name ?? null,
      },
      termId: term.id,
      termName: term.name,
      attendanceSummary: {
        overallRate,
        thisTermRate,
        monthlyBreakdown,
      },
      subjectSummaries,
      academicFlags: academicFlagRows.map((f) => ({
        type: f.type,
        description: f.description,
        subjectName: flagSubjectNameById.get(f.subjectId) ?? 'Unknown subject',
        flaggedAt: f.flaggedAt,
      })),
      overallRank: termResult?.rank ?? null,
      overallAverage: termResult?.percentage != null ? Number(termResult.percentage) : null,
    };
  }
}
