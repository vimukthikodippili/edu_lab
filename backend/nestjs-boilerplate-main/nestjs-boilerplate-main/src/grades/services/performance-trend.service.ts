import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TopicTermSnapshotEntity } from '../entities/topic-term-snapshot.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { assignRanksAndPercentiles } from './result-computation.service';
import { FORBIDDEN_CLINICAL_TERMS } from './grade-trend.service';

// Re-exported so callers/tests don't need to know this list lives in GradeTrendService —
// this feature's recommendation text is content-safety-tested against the same constant.
export { FORBIDDEN_CLINICAL_TERMS };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PerformanceTrendDirection = 'improving' | 'stable' | 'declining';

/** Two consecutive term-to-term moves each at/above the threshold — structurally the same
 * "two consecutive moves" idea as GradeTrendService.isDecliningTrend/isImprovingTrend, but a
 * DISTINCT, smaller-threshold, inclusive (>=) comparison tuned for smooth per-term averages
 * rather than noisy per-assessment scores. Needed so this feature's own worked example
 * (60 -> 55 -> 48, drops of 5 and 7) actually classifies as declining — GradeTrendService's
 * default threshold of 5 combined with a strict `>` would not fire on the first drop. */
export function isTermSequenceDeclining(averages: number[], threshold = 2): boolean {
  if (averages.length < 3) return false;
  for (let i = 0; i <= averages.length - 3; i++) {
    const drop1 = averages[i] - averages[i + 1];
    const drop2 = averages[i + 1] - averages[i + 2];
    if (drop1 >= threshold && drop2 >= threshold) return true;
  }
  return false;
}

export function isTermSequenceImproving(averages: number[], threshold = 2): boolean {
  if (averages.length < 3) return false;
  for (let i = 0; i <= averages.length - 3; i++) {
    const rise1 = averages[i + 1] - averages[i];
    const rise2 = averages[i + 2] - averages[i + 1];
    if (rise1 >= threshold && rise2 >= threshold) return true;
  }
  return false;
}

function classifySequence(averages: number[], threshold = 2): PerformanceTrendDirection {
  if (isTermSequenceDeclining(averages, threshold)) return 'declining';
  if (isTermSequenceImproving(averages, threshold)) return 'improving';
  return 'stable';
}

/** Simple adjacent-term comparison ("vs previous term") — a single 2-point comparison, not the
 * 2-consecutive-moves sequence check above. The first term in any sequence has no previous term
 * to compare against, so it's honestly reported as 'stable' rather than guessed. */
function classifyAdjacent(current: number, previous: number | null, threshold = 2): PerformanceTrendDirection {
  if (previous === null) return 'stable';
  if (current - previous >= threshold) return 'improving';
  if (previous - current >= threshold) return 'declining';
  return 'stable';
}

export function buildTopicRecommendation(topicName: string): string {
  return `Extra practice in ${topicName} may help — the recent average is below the target level.`;
}

export interface TopicBreakdownRow {
  subjectTopicId: string;
  topicName: string;
  studentAverage: number;
  classAverage: number;
  isWeak: boolean;
}

export interface TermTrendPoint {
  termId: number;
  termNumber: number;
  termLabel: string;
  studentAverage: number | null;
  classAverage: number | null;
  classRank: number | null;
  classSize: number;
  trend: PerformanceTrendDirection;
  topicBreakdown: TopicBreakdownRow[];
}

export interface YearlyTrendPoint {
  academicYear: string;
  yearLabel: string;
  termTrends: TermTrendPoint[];
  yearAverage: number | null;
  yearClassRank: number | null;
}

export interface TopicOverallTrend {
  subjectTopicId: string;
  topicName: string;
  trend: PerformanceTrendDirection;
  firstTermAverage: number;
  latestTermAverage: number;
}

export interface WeakTopicRow {
  subjectTopicId: string;
  topicName: string;
  currentAverage: number;
  recommendation: string;
}

export interface SubjectTrend {
  subjectId: string;
  subjectName: string;
  yearlyTrends: YearlyTrendPoint[];
  overallTrend: PerformanceTrendDirection;
  topicTrends: TopicOverallTrend[];
  personalBestTerm: { termLabel: string; average: number } | null;
  weakTopicsCurrently: WeakTopicRow[];
}

export interface PerformanceTrendResponse {
  student: { id: string; fullName: string; grade: string };
  subjects: SubjectTrend[];
}

export interface ClassTrendCell {
  termId: number;
  termLabel: string;
  average: number | null;
  classAverage: number | null;
}

export interface ClassTrendStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  cells: ClassTrendCell[];
  consistentlyWeak: boolean;
}

export interface ClassSubjectTrendGrid {
  classSectionId: number;
  subjectId: string;
  subjectName: string;
  terms: { termId: number; termLabel: string }[];
  rows: ClassTrendStudentRow[];
}

export interface SchoolSubjectYearPoint {
  academicYear: string;
  schoolAverage: number;
}

export interface SchoolSubjectYearTrend {
  subjectId: string;
  subjectName: string;
  yearlyAverages: SchoolSubjectYearPoint[];
  yearOverYearDelta: number | null;
  consistentlyWeakStudentCount: number;
}

export interface SchoolSubjectYearTrendsResponse {
  subjects: SchoolSubjectYearTrend[];
  mostConsistentlyWeakSubject: { subjectId: string; subjectName: string; weakStudentCount: number } | null;
}

@Injectable()
export class PerformanceTrendService {
  constructor(
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(TopicTermSnapshotEntity)
    private readonly snapshotRepo: Repository<TopicTermSnapshotEntity>,
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(MarkTopicScoreEntity)
    private readonly topicScoreRepo: Repository<MarkTopicScoreEntity>,
    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
  ) {}

  // ─────────────────────── Snapshot computation ──────────────────────────────

  /** Computes and upserts one TopicTermSnapshotEntity row per (student, topic) for every topic
   * examined in this term — the definitive per-term average across every assessment in the term
   * (not a rolling recent-window heuristic like TopicWeaknessService's weekly cron), since this
   * is meant to be a stable historical snapshot, not a "recent trend" signal.
   *
   * `studentIds`, when given, ONLY restricts which students get a snapshot row upserted (the
   * event-driven path from a single publish action, which may newly-publish just a subset of the
   * class) — it must NEVER restrict which marks feed the classAverage calculation, or a student
   * published alone would get a "class average" equal to their own score. Marks are always
   * fetched for the WHOLE class+term first; studentIds is applied only when deciding which
   * (student, topic) groups to save. */
  async computeTopicSnapshotsForTerm(
    termId: number,
    classSectionId?: number,
    studentIds?: string[],
  ): Promise<number> {
    const assessments = await this.assessmentRepo.find({
      where: classSectionId ? { termId, classSectionId } : { termId },
    });
    if (assessments.length === 0) return 0;
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));

    const marks = await this.markRepo.find({
      where: {
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });
    if (marks.length === 0) return 0;
    const markById = new Map(marks.map((m) => [m.id, m]));
    const studentIdSet = studentIds && studentIds.length > 0 ? new Set(studentIds) : null;

    const topicScores = await this.topicScoreRepo.find({
      where: { markId: In(marks.map((m) => m.id)) },
    });
    if (topicScores.length === 0) return 0;

    const allocations = await this.allocationRepo.find({
      where: { assessmentId: In(assessments.map((a) => a.id)) },
    });
    const maxMarksByKey = new Map(
      allocations.map((a) => [`${a.assessmentId}:${a.subjectTopicId}`, a.maxMarks]),
    );

    const byStudentTopic = new Map<string, number[]>();
    const byClassTopic = new Map<string, number[]>();
    const contextByKey = new Map<
      string,
      { studentId: string; subjectId: string; subjectTopicId: string; classSectionId: number }
    >();

    for (const ts of topicScores) {
      const mark = markById.get(ts.markId);
      if (!mark) continue;
      const assessment = assessmentById.get(mark.assessmentId);
      if (!assessment) continue;
      const maxMarks = maxMarksByKey.get(`${mark.assessmentId}:${ts.subjectTopicId}`);
      if (!maxMarks) continue;

      const percent = (Number(ts.score) / maxMarks) * 100;

      const studentKey = `${mark.studentId}::${ts.subjectTopicId}`;
      const points = byStudentTopic.get(studentKey) ?? [];
      points.push(percent);
      byStudentTopic.set(studentKey, points);
      contextByKey.set(studentKey, {
        studentId: mark.studentId,
        subjectId: assessment.subjectId,
        subjectTopicId: ts.subjectTopicId,
        classSectionId: assessment.classSectionId,
      });

      const classKey = `${assessment.classSectionId}::${ts.subjectTopicId}`;
      const classPercents = byClassTopic.get(classKey) ?? [];
      classPercents.push(percent);
      byClassTopic.set(classKey, classPercents);
    }

    const rowsToSave: TopicTermSnapshotEntity[] = [];
    for (const [key, points] of byStudentTopic.entries()) {
      const context = contextByKey.get(key)!;
      if (studentIdSet && !studentIdSet.has(context.studentId)) continue;

      const studentAverage = round2(points.reduce((sum, p) => sum + p, 0) / points.length);

      const classPercents =
        byClassTopic.get(`${context.classSectionId}::${context.subjectTopicId}`) ?? [];
      const classAverage = round2(
        classPercents.reduce((sum, p) => sum + p, 0) / classPercents.length,
      );

      let row = await this.snapshotRepo.findOne({
        where: { studentId: context.studentId, subjectTopicId: context.subjectTopicId, termId },
      });
      if (!row) {
        row = this.snapshotRepo.create({
          studentId: context.studentId,
          subjectTopicId: context.subjectTopicId,
          termId,
        });
      }
      row.subjectId = context.subjectId;
      row.classSectionId = context.classSectionId;
      row.studentAverage = String(studentAverage);
      row.classAverage = String(classAverage);
      row.isWeak = studentAverage < 50;
      row.assessmentCount = points.length;
      row.computedAt = new Date();
      rowsToSave.push(row);
    }

    if (rowsToSave.length > 0) {
      await this.snapshotRepo.save(rowsToSave);
    }
    return rowsToSave.length;
  }

  // ─────────────────────── Multi-year trend aggregation ──────────────────────

  async getPerformanceTrend(
    studentId: string,
    subjectId?: string,
    scopeToTeacherId?: string,
  ): Promise<PerformanceTrendResponse> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student ${studentId} not found.`);

    const results = await this.subjectResultRepo.find({
      where: subjectId ? { studentId, subjectId } : { studentId },
    });

    const bySubject = new Map<string, SubjectResultEntity[]>();
    for (const r of results) {
      const list = bySubject.get(r.subjectId) ?? [];
      list.push(r);
      bySubject.set(r.subjectId, list);
    }

    let subjectIds = [...bySubject.keys()];

    // No subjectId filter + a scoped (non-privileged) teacher caller: narrow the *response* to
    // only subjects that teacher has ever taught this student, rather than 403-ing the whole
    // request — a friendlier behaviour for "show me everything I've taught this student."
    if (!subjectId && scopeToTeacherId) {
      const taughtSubjectIds = new Set<string>();
      await Promise.all(
        subjectIds.map(async (sid) => {
          const ok = await this.teacherEverTaught(scopeToTeacherId, sid, bySubject.get(sid)!);
          if (ok) taughtSubjectIds.add(sid);
        }),
      );
      subjectIds = subjectIds.filter((sid) => taughtSubjectIds.has(sid));
    }

    const subjects = await Promise.all(
      subjectIds.map((sid) => this.buildSubjectTrend(sid, bySubject.get(sid)!)),
    );

    return {
      student: { id: student.id, fullName: `${student.firstName} ${student.lastName}`, grade: student.grade.name },
      subjects,
    };
  }

  /** Does this teacher have a TeacherSubjectClassRequirement for this subject in ANY class
   * section the student has historically been in for this subject (per their own
   * SubjectResultEntity rows)? Requires no separate class-section-history table — the rows
   * already carry the classSectionId that was current at computation time each term. */
  async teacherEverTaught(
    teacherId: string,
    subjectId: string,
    studentSubjectResults: SubjectResultEntity[],
  ): Promise<boolean> {
    const classSectionIds = [...new Set(studentSubjectResults.map((r) => r.classSectionId))];
    if (classSectionIds.length === 0) return false;
    const count = await this.requirementRepo.count({
      where: { teacherId, subjectId, classSectionId: In(classSectionIds) },
    });
    return count > 0;
  }

  private async buildSubjectTrend(
    subjectId: string,
    rows: SubjectResultEntity[],
  ): Promise<SubjectTrend> {
    const sorted = [...rows].sort((a, b) => {
      if (a.term.academicYear !== b.term.academicYear) {
        return a.term.academicYear.localeCompare(b.term.academicYear);
      }
      return a.term.termNumber - b.term.termNumber;
    });

    const termIds = sorted.map((r) => r.termId);
    const snapshots = await this.snapshotRepo.find({
      where: { studentId: sorted[0].studentId, subjectId, termId: In(termIds) },
    });
    const snapshotsByTerm = new Map<number, TopicTermSnapshotEntity[]>();
    for (const s of snapshots) {
      const list = snapshotsByTerm.get(s.termId) ?? [];
      list.push(s);
      snapshotsByTerm.set(s.termId, list);
    }

    // classSize per (classSectionId, termId) pair — batched once for every distinct pair
    // this student's history touches, rather than one query per term.
    const pairs = [...new Set(sorted.map((r) => `${r.classSectionId}::${r.termId}`))];
    const classSizeByPair = new Map<string, number>();
    await Promise.all(
      pairs.map(async (pairKey) => {
        const [classSectionId, termId] = pairKey.split('::').map(Number);
        const count = await this.subjectResultRepo.count({
          where: { subjectId, classSectionId, termId },
        });
        classSizeByPair.set(pairKey, count);
      }),
    );

    const studentAverages = sorted.map((r) => (r.percentage !== null ? Number(r.percentage) : null));

    const termTrends: TermTrendPoint[] = sorted.map((r, i) => {
      const topicBreakdown: TopicBreakdownRow[] = (snapshotsByTerm.get(r.termId) ?? []).map((s) => ({
        subjectTopicId: s.subjectTopicId,
        topicName: s.subjectTopic.title,
        studentAverage: Number(s.studentAverage),
        classAverage: Number(s.classAverage),
        isWeak: s.isWeak,
      }));

      const current = studentAverages[i];
      const previous = i > 0 ? studentAverages[i - 1] : null;

      return {
        termId: r.termId,
        termNumber: r.term.termNumber,
        // AcademicTermEntity.name already reads e.g. "Term 1 2026" — the year is baked in, so
        // don't append academicYear again here.
        termLabel: r.term.name,
        studentAverage: current,
        classAverage: r.subjectClassAveragePercentage !== null ? Number(r.subjectClassAveragePercentage) : null,
        classRank: r.subjectRank,
        classSize: classSizeByPair.get(`${r.classSectionId}::${r.termId}`) ?? 0,
        trend: current !== null ? classifyAdjacent(current, previous) : 'stable',
        topicBreakdown,
      };
    });

    // Group into years, computing an in-memory year-class-rank across every student who has
    // SubjectResultEntity rows for the same subject+terms within that year (no new persistence).
    const years = [...new Set(sorted.map((r) => r.term.academicYear))];
    const yearlyTrends: YearlyTrendPoint[] = await Promise.all(
      years.map(async (year) => {
        const yearTermTrends = termTrends.filter((t, i) => sorted[i].term.academicYear === year);
        const yearRows = sorted.filter((r) => r.term.academicYear === year);
        const yearTermIds = yearRows.map((r) => r.termId);

        const yearAverages = yearTermTrends.map((t) => t.studentAverage).filter((v): v is number => v !== null);
        const yearAverage = yearAverages.length > 0 ? round2(yearAverages.reduce((s, v) => s + v, 0) / yearAverages.length) : null;

        let yearClassRank: number | null = null;
        if (yearAverage !== null) {
          const classSectionId = yearRows[0].classSectionId;
          const peerRows = await this.subjectResultRepo.find({
            where: { subjectId, classSectionId, termId: In(yearTermIds) },
          });
          const peerAverages = new Map<string, number[]>();
          for (const pr of peerRows) {
            if (pr.percentage === null) continue;
            const list = peerAverages.get(pr.studentId) ?? [];
            list.push(Number(pr.percentage));
            peerAverages.set(pr.studentId, list);
          }
          const peerYearAverages = [...peerAverages.entries()].map(([sid, vals]) => ({
            studentId: sid,
            avg: round2(vals.reduce((s, v) => s + v, 0) / vals.length),
          }));
          peerYearAverages.sort((a, b) => b.avg - a.avg);
          const ranking = assignRanksAndPercentiles(peerYearAverages.map((p) => String(p.avg)));
          const idx = peerYearAverages.findIndex((p) => p.studentId === sorted[0].studentId);
          yearClassRank = idx >= 0 ? ranking[idx].rank : null;
        }

        return {
          academicYear: year,
          yearLabel: `Year ${year}`,
          termTrends: yearTermTrends,
          yearAverage,
          yearClassRank,
        };
      }),
    );

    const validAverages = studentAverages.filter((v): v is number => v !== null);
    const overallTrend = classifySequence(validAverages);

    // Per-topic overall trend across the subject's full chronological term history.
    const topicSeriesById = new Map<string, { title: string; values: number[] }>();
    for (const term of termTrends) {
      for (const topic of term.topicBreakdown) {
        const entry = topicSeriesById.get(topic.subjectTopicId) ?? { title: topic.topicName, values: [] };
        entry.values.push(topic.studentAverage);
        topicSeriesById.set(topic.subjectTopicId, entry);
      }
    }
    const topicTrends: TopicOverallTrend[] = [...topicSeriesById.entries()].map(([subjectTopicId, entry]) => ({
      subjectTopicId,
      topicName: entry.title,
      trend: classifySequence(entry.values),
      firstTermAverage: entry.values[0],
      latestTermAverage: entry.values[entry.values.length - 1],
    }));

    let personalBestTerm: SubjectTrend['personalBestTerm'] = null;
    const withAverages = termTrends.filter((t) => t.studentAverage !== null);
    if (withAverages.length > 0) {
      const best = withAverages.reduce((a, b) => (b.studentAverage! > a.studentAverage! ? b : a));
      personalBestTerm = { termLabel: best.termLabel, average: best.studentAverage! };
    }

    const latestTermWithSnapshots = [...termTrends].reverse().find((t) => t.topicBreakdown.length > 0);
    const weakTopicsCurrently: WeakTopicRow[] = (latestTermWithSnapshots?.topicBreakdown ?? [])
      .filter((t) => t.isWeak)
      .map((t) => ({
        subjectTopicId: t.subjectTopicId,
        topicName: t.topicName,
        currentAverage: t.studentAverage,
        recommendation: buildTopicRecommendation(t.topicName),
      }));

    return {
      subjectId,
      subjectName: sorted[0].subject.name,
      yearlyTrends,
      overallTrend,
      topicTrends,
      personalBestTerm,
      weakTopicsCurrently,
    };
  }

  // ─────────────────────── Class-level grid (teacher Class Trends page) ──────

  /** One row per student currently in the class, one column per term this class+subject has
   * results for (a class section only ever exists within one academic year, so this is
   * naturally scoped to that year's terms) — "consistently weak" = 3+ terms below 50%. */
  async getClassSubjectTrendGrid(
    classSectionId: number,
    subjectId: string,
  ): Promise<ClassSubjectTrendGrid> {
    const results = await this.subjectResultRepo.find({
      where: { classSectionId, subjectId },
    });
    const students = await this.studentRepo.find({
      where: { classSectionId },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const termsMap = new Map<number, { termId: number; termLabel: string; termNumber: number }>();
    for (const r of results) {
      if (!termsMap.has(r.termId)) {
        termsMap.set(r.termId, { termId: r.termId, termLabel: `${r.term.name}`, termNumber: r.term.termNumber });
      }
    }
    const terms = [...termsMap.values()].sort((a, b) => a.termNumber - b.termNumber);

    const resultsByStudentTerm = new Map<string, SubjectResultEntity>();
    for (const r of results) {
      resultsByStudentTerm.set(`${r.studentId}::${r.termId}`, r);
    }

    const rows: ClassTrendStudentRow[] = students.map((student) => {
      const cells: ClassTrendCell[] = terms.map((t) => {
        const r = resultsByStudentTerm.get(`${student.id}::${t.termId}`);
        return {
          termId: t.termId,
          termLabel: t.termLabel,
          average: r?.percentage !== null && r?.percentage !== undefined ? Number(r.percentage) : null,
          classAverage:
            r?.subjectClassAveragePercentage !== null && r?.subjectClassAveragePercentage !== undefined
              ? Number(r.subjectClassAveragePercentage)
              : null,
        };
      });
      const weakTermCount = cells.filter((c) => c.average !== null && c.average < 50).length;
      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        cells,
        consistentlyWeak: weakTermCount >= 3,
      };
    });

    const subjectName = results[0]?.subject.name ?? '';
    return { classSectionId, subjectId, subjectName, terms, rows };
  }

  // ─────────────────────── School-wide analytics (Principal page) ────────────

  async getSchoolSubjectYearTrends(): Promise<SchoolSubjectYearTrendsResponse> {
    const results = await this.subjectResultRepo.find({ where: { isComplete: true } });

    const bySubject = new Map<string, SubjectResultEntity[]>();
    for (const r of results) {
      const list = bySubject.get(r.subjectId) ?? [];
      list.push(r);
      bySubject.set(r.subjectId, list);
    }

    const subjects: SchoolSubjectYearTrend[] = [...bySubject.entries()].map(([subjectId, rows]) => {
      const byYear = new Map<string, number[]>();
      for (const r of rows) {
        if (r.percentage === null) continue;
        const list = byYear.get(r.term.academicYear) ?? [];
        list.push(Number(r.percentage));
        byYear.set(r.term.academicYear, list);
      }
      const yearlyAverages: SchoolSubjectYearPoint[] = [...byYear.entries()]
        .map(([academicYear, values]) => ({
          academicYear,
          schoolAverage: round2(values.reduce((s, v) => s + v, 0) / values.length),
        }))
        .sort((a, b) => a.academicYear.localeCompare(b.academicYear));

      const yearOverYearDelta =
        yearlyAverages.length >= 2
          ? round2(
              yearlyAverages[yearlyAverages.length - 1].schoolAverage -
                yearlyAverages[yearlyAverages.length - 2].schoolAverage,
            )
          : null;

      const byStudent = new Map<string, number>();
      for (const r of rows) {
        if (r.percentage === null) continue;
        if (Number(r.percentage) < 50) {
          byStudent.set(r.studentId, (byStudent.get(r.studentId) ?? 0) + 1);
        }
      }
      const consistentlyWeakStudentCount = [...byStudent.values()].filter((n) => n >= 3).length;

      return {
        subjectId,
        subjectName: rows[0].subject.name,
        yearlyAverages,
        yearOverYearDelta,
        consistentlyWeakStudentCount,
      };
    });

    const mostWeak = [...subjects].sort(
      (a, b) => b.consistentlyWeakStudentCount - a.consistentlyWeakStudentCount,
    )[0];

    return {
      subjects,
      mostConsistentlyWeakSubject:
        mostWeak && mostWeak.consistentlyWeakStudentCount > 0
          ? {
              subjectId: mostWeak.subjectId,
              subjectName: mostWeak.subjectName,
              weakStudentCount: mostWeak.consistentlyWeakStudentCount,
            }
          : null,
    };
  }
}
