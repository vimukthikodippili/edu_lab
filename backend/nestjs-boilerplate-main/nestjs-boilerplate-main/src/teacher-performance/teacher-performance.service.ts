import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { StaffAttendanceEntity, StaffAttendanceStatus } from '../attendance/entities/staff-attendance.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { AnnualLessonPlanEntryEntity } from '../lesson-plan/entities/annual-lesson-plan-entry.entity';
import { TeacherPerformanceSnapshotEntity } from './entities/teacher-performance-snapshot.entity';
import { AllConfigType } from '../config/config.type';
import {
  AttendanceSummary,
  ClassSubjectPerformanceRow,
  MonthlyAttendanceRow,
  StaffPerformanceDto,
  SubjectSyllabusRow,
  SyllabusSummary,
  TeacherPerformanceDto,
} from './dto/teacher-performance.dto';

interface SectionPassRateStats {
  passRate: number;
  averageMarkPercent: number;
  assessmentsCount: number;
  submittedMarksCount: number;
}

@Injectable()
export class TeacherPerformanceService {
  private readonly logger = new Logger(TeacherPerformanceService.name);

  constructor(
    @InjectRepository(StaffAttendanceEntity)
    private readonly staffAttendanceRepo: Repository<StaffAttendanceEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,

    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(AnnualLessonPlanEntryEntity)
    private readonly entryRepo: Repository<AnnualLessonPlanEntryEntity>,

    @InjectRepository(TeacherPerformanceSnapshotEntity)
    private readonly snapshotRepo: Repository<TeacherPerformanceSnapshotEntity>,

    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async getMyPerformance(staffId: string): Promise<TeacherPerformanceDto> {
    const academicYear = String(new Date().getFullYear());

    const [attendanceRecords, classResults, syllabusEntries] = await Promise.all([
      this.staffAttendanceRepo.find({ where: { staffId }, order: { date: 'ASC' } }),
      this.computeClassResults(staffId),
      this.entryRepo.find({ where: { staffId, academicYear } }),
    ]);

    return {
      attendance: this.summarizeAttendance(attendanceRecords),
      classResults,
      syllabus: this.summarizeSyllabus(syllabusEntries),
    };
  }

  async getPerformanceForStaff(staffId: string): Promise<StaffPerformanceDto> {
    const academicYear = String(new Date().getFullYear());

    const [attendanceRecords, classResults, syllabusEntries] = await Promise.all([
      this.staffAttendanceRepo.find({ where: { staffId }, order: { date: 'ASC' } }),
      this.computeClassResultsWithOutliers(staffId),
      this.entryRepo.find({ where: { staffId, academicYear } }),
    ]);

    const consecutivePeriods = this.configService.get(
      'teacherPerformance.behindScheduleConsecutivePeriods',
      { infer: true },
    ) as number;

    return {
      attendance: this.summarizeAttendance(attendanceRecords),
      classResults,
      syllabus: this.summarizeSyllabus(syllabusEntries),
      behindScheduleOutlier: await this.computeBehindScheduleOutlierFromSnapshots(staffId, consecutivePeriods),
    };
  }

  private summarizeAttendance(records: StaffAttendanceEntity[]): AttendanceSummary {
    const byMonth = new Map<string, StaffAttendanceEntity[]>();
    for (const record of records) {
      const month = new Date(record.date).toISOString().slice(0, 7);
      const bucket = byMonth.get(month) ?? [];
      bucket.push(record);
      byMonth.set(month, bucket);
    }

    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, rows]) => this.summarizeAttendanceRows(month, rows));

    const overallRow = this.summarizeAttendanceRows('overall', records);

    return {
      monthly,
      overall: {
        totalMarkedDays: overallRow.totalMarkedDays,
        presentRate: overallRow.presentRate,
        punctualityRate: overallRow.punctualityRate,
      },
    };
  }

  private summarizeAttendanceRows(month: string, rows: StaffAttendanceEntity[]): MonthlyAttendanceRow {
    const presentCount = rows.filter((r) => r.status === StaffAttendanceStatus.PRESENT).length;
    const absentCount = rows.filter((r) => r.status === StaffAttendanceStatus.ABSENT).length;
    const lateCount = rows.filter((r) => r.status === StaffAttendanceStatus.LATE).length;
    const halfDayCount = rows.filter((r) => r.status === StaffAttendanceStatus.HALF_DAY).length;
    const onLeaveCount = rows.filter((r) => r.status === StaffAttendanceStatus.ON_LEAVE).length;
    const totalMarkedDays = rows.length;
    const presentRate =
      totalMarkedDays === 0 ? 0 : ((presentCount + halfDayCount * 0.5) / totalMarkedDays) * 100;
    const punctualityRate = totalMarkedDays === 0 ? 0 : ((totalMarkedDays - lateCount) / totalMarkedDays) * 100;

    return {
      month,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      onLeaveCount,
      totalMarkedDays,
      presentRate,
      punctualityRate,
    };
  }

  private async computePassRateForSection(
    subjectId: string,
    classSectionId: number,
    passMarkPercent: number,
  ): Promise<SectionPassRateStats> {
    const assessments = await this.assessmentRepo.find({ where: { subjectId, classSectionId } });
    const assessmentIds = assessments.map((a) => a.id);
    const marks = assessmentIds.length
      ? await this.markRepo.find({ where: { assessmentId: In(assessmentIds), status: MarkStatus.SUBMITTED } })
      : [];
    const totalMarksByAssessmentId = new Map(assessments.map((a) => [a.id, a.totalMarks]));

    const percentScores = marks.map(
      (mark) => (Number(mark.score) / totalMarksByAssessmentId.get(mark.assessmentId)!) * 100,
    );
    const passCount = percentScores.filter((p) => p >= passMarkPercent).length;
    const passRate = percentScores.length === 0 ? 0 : (passCount / percentScores.length) * 100;
    const averageMarkPercent =
      percentScores.length === 0 ? 0 : percentScores.reduce((a, b) => a + b, 0) / percentScores.length;

    return {
      passRate,
      averageMarkPercent,
      assessmentsCount: assessments.length,
      submittedMarksCount: marks.length,
    };
  }

  private async computeClassResults(staffId: string): Promise<ClassSubjectPerformanceRow[]> {
    const requirements = await this.requirementRepo.find({ where: { teacherId: staffId } });
    const uniquePairs = [
      ...new Map(
        requirements.map((r) => [`${r.subjectId}::${r.classSectionId}`, { subjectId: r.subjectId, classSectionId: r.classSectionId }]),
      ).values(),
    ];
    if (!uniquePairs.length) return [];

    const subjectIds = [...new Set(uniquePairs.map((p) => p.subjectId))];
    const classSectionIds = [...new Set(uniquePairs.map((p) => p.classSectionId))];
    const [subjects, classSections] = await Promise.all([
      this.subjectRepo.find({ where: { id: In(subjectIds) } }),
      this.classSectionRepo.find({ where: { id: In(classSectionIds) } }),
    ]);
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
    const classSectionNameById = new Map(classSections.map((c) => [c.id, c.name]));

    const passMarkPercent = this.configService.get('teacherPerformance.passMarkPercent', {
      infer: true,
    }) as number;

    return Promise.all(
      uniquePairs.map(async ({ subjectId, classSectionId }) => {
        const stats = await this.computePassRateForSection(subjectId, classSectionId, passMarkPercent);
        return {
          subjectId,
          subjectName: subjectNameById.get(subjectId) ?? 'Unknown subject',
          classSectionId,
          classSectionName: classSectionNameById.get(classSectionId) ?? `Section ${classSectionId}`,
          assessmentsCount: stats.assessmentsCount,
          submittedMarksCount: stats.submittedMarksCount,
          passRate: stats.passRate,
          averageMarkPercent: stats.averageMarkPercent,
          isPassRateOutlier: false,
          priorYearAveragePassRate: null,
        };
      }),
    );
  }

  private async computeClassResultsWithOutliers(staffId: string): Promise<ClassSubjectPerformanceRow[]> {
    const baseRows = await this.computeClassResults(staffId);
    if (!baseRows.length) return baseRows;

    const passMarkPercent = this.configService.get('teacherPerformance.passMarkPercent', {
      infer: true,
    }) as number;

    const classSectionIds = [...new Set(baseRows.map((r) => r.classSectionId))];
    const classSections = await this.classSectionRepo.find({ where: { id: In(classSectionIds) } });
    const gradeIdByClassSectionId = new Map(classSections.map((c) => [c.id, c.gradeId]));

    return Promise.all(
      baseRows.map(async (row) => {
        const gradeId = gradeIdByClassSectionId.get(row.classSectionId);
        if (gradeId === undefined) return row;

        const peers = await this.computeSubjectGradePassRateStats(row.subjectId, gradeId, passMarkPercent);
        const { mean, stddev } = this.computeMeanAndStdDev(peers.map((p) => p.passRate));
        const isPassRateOutlier = peers.length > 0 && this.isBelowPeerThreshold(row.passRate, mean, stddev);

        const priorYearAveragePassRate = isPassRateOutlier
          ? await this.findPriorYearAveragePassRate(row.classSectionId, row.subjectId, passMarkPercent)
          : null;

        return { ...row, isPassRateOutlier, priorYearAveragePassRate };
      }),
    );
  }

  private async computeSubjectGradePassRateStats(
    subjectId: string,
    gradeId: number,
    passMarkPercent: number,
  ): Promise<{ classSectionId: number; passRate: number }[]> {
    const requirements = await this.requirementRepo.find({ where: { subjectId } });
    const classSectionIds = [...new Set(requirements.map((r) => r.classSectionId))];
    if (!classSectionIds.length) return [];

    const classSections = await this.classSectionRepo.find({
      where: { id: In(classSectionIds), gradeId },
    });

    return Promise.all(
      classSections.map(async (section) => {
        const stats = await this.computePassRateForSection(subjectId, section.id, passMarkPercent);
        return { classSectionId: section.id, passRate: stats.passRate };
      }),
    );
  }

  computeMeanAndStdDev(values: number[]): { mean: number; stddev: number } {
    if (!values.length) return { mean: 0, stddev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return { mean, stddev: Math.sqrt(variance) };
  }

  isBelowPeerThreshold(value: number, mean: number, stddev: number): boolean {
    return value < mean - stddev;
  }

  private async findPriorYearAveragePassRate(
    classSectionId: number,
    subjectId: string,
    passMarkPercent: number,
  ): Promise<number | null> {
    const currentSection = await this.classSectionRepo.findOne({ where: { id: classSectionId } });
    if (!currentSection) return null;

    const priorYear = String(Number(currentSection.academicYear) - 1);
    const candidates = await this.classSectionRepo.find({
      where: { name: currentSection.name, gradeId: currentSection.gradeId, academicYear: priorYear },
    });
    if (candidates.length !== 1) return null;

    const stats = await this.computePassRateForSection(subjectId, candidates[0].id, passMarkPercent);
    return stats.passRate;
  }

  /**
   * Weekly, per-teacher snapshot of syllabus pace: how much of the annual plan is actually
   * complete vs. how much the plan itself expects to be complete by this point in the year.
   * Persisted so the behind-schedule outlier can look at real history across weeks, rather than
   * recomputing "how many months has this been going on" from raw entries every time.
   */
  @Cron('0 6 * * 1')
  async generateWeeklySnapshots(): Promise<void> {
    const academicYear = String(new Date().getFullYear());
    const todayIso = new Date().toISOString().slice(0, 10);
    const weekStartDate = this.getWeekStartDate(new Date());

    const entries = await this.entryRepo.find({ where: { academicYear } });

    const byStaff = new Map<string, AnnualLessonPlanEntryEntity[]>();
    for (const entry of entries) {
      const bucket = byStaff.get(entry.staffId) ?? [];
      bucket.push(entry);
      byStaff.set(entry.staffId, bucket);
    }

    let count = 0;
    for (const [staffId, staffEntries] of byStaff) {
      const total = staffEntries.length;
      if (total === 0) continue;

      const completed = staffEntries.filter((e) => e.isComplete).length;
      const due = staffEntries.filter((e) => e.plannedCompletionDate <= todayIso).length;

      const syllabusCompletionPercent = (completed / total) * 100;
      const plannedCompletionPercent = (due / total) * 100;

      let snapshot = await this.snapshotRepo.findOne({ where: { staffId, weekStartDate } });
      snapshot =
        snapshot ??
        this.snapshotRepo.create({ staffId, weekStartDate, academicYear });
      snapshot.syllabusCompletionPercent = syllabusCompletionPercent;
      snapshot.plannedCompletionPercent = plannedCompletionPercent;

      await this.snapshotRepo.save(snapshot);
      count++;
    }

    this.logger.log(`Generated ${count} teacher performance snapshot(s) for week of ${weekStartDate}.`);
  }

  private getWeekStartDate(date: Date): string {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diffToMonday);
    return d.toISOString().slice(0, 10);
  }

  async computeBehindScheduleOutlierFromSnapshots(
    staffId: string,
    consecutivePeriods: number,
  ): Promise<boolean> {
    const snapshots = await this.snapshotRepo.find({
      where: { staffId },
      order: { weekStartDate: 'DESC' },
      take: consecutivePeriods,
    });

    if (snapshots.length < consecutivePeriods) return false;

    return snapshots.every(
      (s) => s.syllabusCompletionPercent < s.plannedCompletionPercent,
    );
  }

  private summarizeSyllabus(entries: AnnualLessonPlanEntryEntity[]): SyllabusSummary {
    const bySubjectMap = new Map<string, { subjectName: string; totalUnits: number; completedUnits: number }>();
    for (const entry of entries) {
      const subjectId = entry.syllabusUnit.subjectId;
      const subjectName = entry.syllabusUnit.subject.name;
      const bucket = bySubjectMap.get(subjectId) ?? { subjectName, totalUnits: 0, completedUnits: 0 };
      bucket.totalUnits += 1;
      if (entry.isComplete) bucket.completedUnits += 1;
      bySubjectMap.set(subjectId, bucket);
    }

    const bySubject: SubjectSyllabusRow[] = [...bySubjectMap.entries()].map(([subjectId, v]) => ({
      subjectId,
      subjectName: v.subjectName,
      totalUnits: v.totalUnits,
      completedUnits: v.completedUnits,
      completionPercent: v.totalUnits === 0 ? 0 : (v.completedUnits / v.totalUnits) * 100,
    }));

    const totalUnits = entries.length;
    const completedUnits = entries.filter((e) => e.isComplete).length;
    const overallCompletionPercent = totalUnits === 0 ? 0 : (completedUnits / totalUnits) * 100;

    return { bySubject, overallCompletionPercent };
  }
}
