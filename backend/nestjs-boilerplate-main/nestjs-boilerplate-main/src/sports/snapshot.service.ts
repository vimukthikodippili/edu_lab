import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Between, Repository } from 'typeorm';
import {
  SportStudentSnapshotEntity,
  TrendFlag,
  YearOnYearFlag,
} from './entities/sport-student-snapshot.entity';
import { SportEntity } from './entities/sport.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import {
  StudentMatchPerformanceEntity,
  PerformanceStatus,
} from './entities/student-match-performance.entity';
import { MatchEntity, MatchType, TeamResult } from './entities/match.entity';
import { CoachAlertEntity, CoachAlertType } from './entities/coach-alert.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { SportsService } from './sports.service';
import { NotificationService } from '../notification/notification.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import type { AllConfigType } from '../config/config.type';
import type { PersonalBestComparisonMode } from './utils/performance-rules';
import {
  computeRollingAvg,
  computeSeasonAvg,
  computeBestValue,
  computeTrendFlag,
  computeYearOnYearFlag,
} from './utils/trend-rules';

export interface SnapshotRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  metricName: string;
  weekEnding: Date;
  rollingAvg: number | null;
  trendFlag: TrendFlag;
  seasonAvg: number | null;
  personalBest: number | null;
  lastSeasonAvg: number | null;
  yearOnYearFlag: YearOnYearFlag | null;
}

/** Same fields as SnapshotRow minus the roster-display fields (firstName/lastName/
 * admissionNumber) — meaningless on a "my own data" self-view. */
export interface StudentMetricSnapshot {
  metricName: string;
  weekEnding: Date;
  rollingAvg: number | null;
  trendFlag: TrendFlag;
  seasonAvg: number | null;
  personalBest: number | null;
  lastSeasonAvg: number | null;
  yearOnYearFlag: YearOnYearFlag | null;
}

export interface SchoolDashboardTopPerformer {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  seasonAvg: number;
}

export interface SchoolDashboardMetricTop {
  metricName: string;
  topPerformers: SchoolDashboardTopPerformer[];
}

export interface SchoolDashboardSportRow {
  sportId: string;
  sportName: string;
  /** A fraction 0–1, excluding NO_RESULT matches from the denominator; null when the sport has
   * no decided matches in that calendar year at all — a genuinely different fact than a 0% rate. */
  thisSeasonWinRate: number | null;
  lastSeasonWinRate: number | null;
  topPerformersByMetric: SchoolDashboardMetricTop[];
  yearOnYearDistribution: {
    better: number;
    worse: number;
    similar: number;
    noData: number;
  };
}

/** FR-P3-AV-07: "no individual detailed metrics visible on the public board" — deliberately no
 * seasonAvg/admissionNumber/personalBest, unlike SchoolDashboardTopPerformer above. Literally
 * just the name, in rank order. */
export interface PublicTopPerformer {
  firstName: string;
  lastName: string;
}

export interface PublicMetricTopPerformers {
  metricName: string;
  topPerformers: PublicTopPerformer[];
}

export interface PublicMatchResult {
  matchId: string;
  date: Date;
  opponent: string | null;
  matchType: MatchType;
  teamResult: TeamResult;
  teamScore: string | null;
}

export interface PublicSportsBoardRow {
  sportId: string;
  sportName: string;
  /** The sport type's display name — a flattened read-model field, not the raw entity. */
  sportType: string;
  matchResults: PublicMatchResult[];
  topPerformersByMetric: PublicMetricTopPerformers[];
}

export interface CoachAlertRow {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  sportId: string;
  sportName: string;
  metricName: string;
  declineValues: number[];
  acknowledgedAt: Date | null;
  acknowledgedByStaffId: string | null;
  createdAt: Date;
}

/** Monday of the week containing `date`, at UTC midnight — the canonical weekEnding key so a
 * recompute triggered on any day of the week lands in the same weekly bucket. */
function mondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(SportStudentSnapshotEntity)
    private readonly snapshotRepo: Repository<SportStudentSnapshotEntity>,

    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,

    @InjectRepository(SportMetricEntity)
    private readonly sportMetricRepo: Repository<SportMetricEntity>,

    @InjectRepository(StudentMatchPerformanceEntity)
    private readonly performanceRepo: Repository<StudentMatchPerformanceEntity>,

    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,

    @InjectRepository(CoachAlertEntity)
    private readonly coachAlertRepo: Repository<CoachAlertEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    private readonly sportsService: SportsService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly schoolSettingsService: SchoolSettingsService,
  ) {}

  /** Weekly Monday-morning entry point, same schedule as GradeTrendService.computeAllTrends() —
   * also directly callable (not cron-only), so it can be triggered on demand via the manual
   * recompute endpoint without waiting for a real Monday. */
  @Cron('0 6 * * 1')
  async computeAllSnapshots(): Promise<void> {
    const sports = await this.sportRepo.find();
    const weekEnding = mondayOfWeek(new Date());

    for (const sport of sports) {
      await this.computeSnapshotsForSport(sport, weekEnding);
    }
  }

  private async computeSnapshotsForSport(sport: SportEntity, weekEnding: Date): Promise<void> {
    // Only SUBMITTED performances count — same data-quality rule as ResultComputationService
    // (drafts are work-in-progress, not a real result yet).
    const performances = await this.performanceRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.match', 'm')
      .where('m.sportId = :sportId', { sportId: sport.id })
      .andWhere('p.status = :status', { status: PerformanceStatus.SUBMITTED })
      .andWhere('m.date >= :seasonStart', { seasonStart: sport.seasonStart })
      .andWhere('m.date <= :seasonEnd', { seasonEnd: sport.seasonEnd })
      .orderBy('m.date', 'ASC')
      .getMany();

    if (performances.length === 0) return;

    const metrics = await this.sportMetricRepo.find({ where: { sportTypeId: sport.sportTypeId } });
    const directionByMetric = new Map<string, PersonalBestComparisonMode>(
      metrics.map((m) => [m.metricName, m.isTimeBased ? 'lower_is_better' : 'higher_is_better']),
    );

    // Group values by (studentId, metricName), preserving match-date order (already ASC).
    const valuesByKey = new Map<string, number[]>();
    for (const p of performances) {
      for (const [metricName, value] of Object.entries(p.metricValues)) {
        const key = `${p.studentId}::${metricName}`;
        const list = valuesByKey.get(key) ?? [];
        list.push(value);
        valuesByKey.set(key, list);
      }
    }

    const yoyThresholdPercent =
      this.configService.get('sportsAnalysis.yoyThresholdPercent', { infer: true }) ?? 10;

    for (const [key, values] of valuesByKey.entries()) {
      const [studentId, metricName] = key.split('::');
      const direction = directionByMetric.get(metricName) ?? 'higher_is_better';

      const existing = await this.snapshotRepo.findOne({
        where: { studentId, sportId: sport.id, metricName, weekEnding },
      });
      const snapshot =
        existing ??
        this.snapshotRepo.create({ studentId, sportId: sport.id, metricName, weekEnding });

      snapshot.rollingAvg = computeRollingAvg(values);
      snapshot.trendFlag = computeTrendFlag(values, direction);
      snapshot.seasonAvg = computeSeasonAvg(values);
      snapshot.personalBest = computeBestValue(values, direction);

      // FR-P3-PA-06: same triple's most recent snapshot dated in the prior calendar year — no
      // FR-P3-SS-05 season-archiving entity exists, so "last season" is read the only way the
      // current schema supports: by calendar year on the same ongoing Sport row.
      const priorYear = weekEnding.getUTCFullYear() - 1;
      const priorYearSnapshot = await this.snapshotRepo.findOne({
        where: {
          studentId,
          sportId: sport.id,
          metricName,
          weekEnding: Between(
            new Date(Date.UTC(priorYear, 0, 1)),
            new Date(Date.UTC(priorYear, 11, 31)),
          ),
        },
        order: { weekEnding: 'DESC' },
      });

      if (priorYearSnapshot?.seasonAvg != null && snapshot.seasonAvg != null) {
        const lastSeasonAvg = Number(priorYearSnapshot.seasonAvg);
        snapshot.lastSeasonAvg = lastSeasonAvg;
        snapshot.yearOnYearFlag = computeYearOnYearFlag(
          snapshot.seasonAvg,
          lastSeasonAvg,
          yoyThresholdPercent,
          direction,
        );
      } else {
        snapshot.lastSeasonAvg = null;
        snapshot.yearOnYearFlag = null;
      }

      await this.snapshotRepo.save(snapshot);
      await this.checkDecliningAlerts(sport, studentId, metricName);
    }
  }

  /** FR-P3-PA-13: if a student's last 3 consecutive snapshots for a (sport, metric) are all
   * Declining, alert the coach — but only once per streak. A streak that persists across
   * several weekly runs must not re-alert every week (same "notify once on transition"
   * discipline as the Late Alert / Student Analysis Engine stories); a *new* streak that starts
   * after an intervening non-declining week must still produce a fresh alert. */
  private async checkDecliningAlerts(
    sport: SportEntity,
    studentId: string,
    metricName: string,
  ): Promise<void> {
    const recentSnapshots = await this.snapshotRepo.find({
      where: { studentId, sportId: sport.id, metricName },
      order: { weekEnding: 'DESC' },
      take: 3,
    });

    if (recentSnapshots.length < 3) return;
    if (!recentSnapshots.every((s) => s.trendFlag === TrendFlag.DECLINING)) return;

    const streakStart = new Date(recentSnapshots[recentSnapshots.length - 1].weekEnding);

    const lastAlert = await this.coachAlertRepo.findOne({
      where: {
        studentId,
        sportId: sport.id,
        metricName,
        alertType: CoachAlertType.DECLINING_TREND,
      },
      order: { createdAt: 'DESC' },
    });

    if (lastAlert && new Date(lastAlert.createdAt) >= streakStart) return;

    // "the last 3 values showing the decline" — recentSnapshots is DESC (newest first),
    // reversed here to oldest→newest so the persisted array reads chronologically.
    const declineValues = [...recentSnapshots]
      .reverse()
      .map((s) => (s.rollingAvg != null ? Number(s.rollingAvg) : 0));

    await this.coachAlertRepo.save(
      this.coachAlertRepo.create({
        studentId,
        sportId: sport.id,
        metricName,
        alertType: CoachAlertType.DECLINING_TREND,
        declineValues,
      }),
    );

    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';

    await this.notificationService.createForStaff(
      sport.coachId,
      'Declining Performance Trend',
      `${studentName}'s ${metricName} performance in ${sport.name} has been declining for 3 consecutive weeks (last 3: ${declineValues.join(', ')}).`,
      'declining_trend',
    );
  }

  /** FR-P3-PA-13: a coach's own declining-alert inbox — without this, "Coach can acknowledge the
   * alert" has no reachable surface (alerts otherwise only ever surface via the generic
   * Notification inbox). Admin/Principal see every alert; a coach sees only alerts for sport(s)
   * where sport.coachId === staffId, mirroring late-alert.findAlerts's list-filtering shape but
   * joining on coach-ownership instead of a grade range. */
  async findAlertsForCoach(
    staffId: string,
    isFullyPrivileged: boolean,
    acknowledged?: boolean,
  ): Promise<CoachAlertRow[]> {
    const qb = this.coachAlertRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.sport', 'sport')
      .innerJoinAndSelect('a.student', 'student')
      .orderBy('a.createdAt', 'DESC');

    if (!isFullyPrivileged) {
      qb.andWhere('sport.coachId = :staffId', { staffId });
    }
    if (acknowledged !== undefined) {
      qb.andWhere(acknowledged ? 'a.acknowledgedAt IS NOT NULL' : 'a.acknowledgedAt IS NULL');
    }

    const alerts = await qb.getMany();

    return alerts.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      firstName: a.student.firstName,
      lastName: a.student.lastName,
      sportId: a.sportId,
      sportName: a.sport.name,
      metricName: a.metricName,
      declineValues: a.declineValues,
      acknowledgedAt: a.acknowledgedAt,
      acknowledgedByStaffId: a.acknowledgedByStaffId,
      createdAt: a.createdAt,
    }));
  }

  /** Deliberately independent of the dedup/streak logic in checkDecliningAlerts — acknowledging
   * is a separate coach-workflow concern from "when does a new alert get created," matching the
   * AC's two independent bullets ("fires once per episode" / "coach can acknowledge") rather than
   * conflating them. */
  async acknowledgeAlert(
    alertId: string,
    staffId: string,
    isFullyPrivileged: boolean,
  ): Promise<CoachAlertEntity> {
    const alert = await this.coachAlertRepo.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new NotFoundException(`Coach alert ${alertId} not found.`);
    }

    if (!isFullyPrivileged) {
      const sport = await this.sportRepo.findOne({ where: { id: alert.sportId } });
      if (!sport || sport.coachId !== staffId) {
        throw new ForbiddenException('You are not the coach for this sport.');
      }
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedByStaffId = staffId;
    return this.coachAlertRepo.save(alert);
  }

  /** Excludes NO_RESULT matches from the denominator — a logged-but-undecided fixture is
   * neither a win nor a loss. Returns null (not 0) when the sport has no decided matches in
   * that calendar year, since "no data" and "0% win rate" are different facts. */
  private async computeWinRate(sportId: string, year: number): Promise<number | null> {
    const matches = await this.matchRepo.find({
      where: {
        sportId,
        date: Between(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31))),
      },
    });

    const decided = matches.filter((m) => m.teamResult !== TeamResult.NO_RESULT);
    if (decided.length === 0) return null;

    const wins = decided.filter((m) => m.teamResult === TeamResult.WIN).length;
    return wins / decided.length;
  }

  /** FR-P3-PA-09/10/11/12: Principal-facing school-wide sports overview — per sport, this-season
   * vs last-season team win rate, top 3 performers per metric by seasonAvg (direction-aware),
   * and the yearOnYearFlag distribution across the sport's roster. Read-only aggregation of data
   * SnapshotService already owns, not a new write path. */
  async getSchoolDashboard(): Promise<SchoolDashboardSportRow[]> {
    const sports = await this.sportRepo.find();
    const thisYear = new Date().getUTCFullYear();
    const lastYear = thisYear - 1;

    const rows: SchoolDashboardSportRow[] = [];
    for (const sport of sports) {
      const [thisSeasonWinRate, lastSeasonWinRate, metrics, { roster }, snapshots] =
        await Promise.all([
          this.computeWinRate(sport.id, thisYear),
          this.computeWinRate(sport.id, lastYear),
          this.sportMetricRepo.find({
            where: { sportTypeId: sport.sportTypeId },
            order: { ordering: 'ASC' },
          }),
          this.sportsService.getRoster(sport.id, '', true),
          this.snapshotRepo.find({ where: { sportId: sport.id }, order: { weekEnding: 'DESC' } }),
        ]);

      const rosterByStudentId = new Map(roster.map((r) => [r.studentId, r]));

      // Fetch-then-group-in-JS for "latest per (studentId, metricName)" — same convention as
      // findLatestSnapshots below.
      const latestByKey = new Map<string, SportStudentSnapshotEntity>();
      for (const s of snapshots) {
        const key = `${s.studentId}::${s.metricName}`;
        if (!latestByKey.has(key)) latestByKey.set(key, s);
      }
      const latestRows = [...latestByKey.values()].filter((s) =>
        rosterByStudentId.has(s.studentId),
      );

      const topPerformersByMetric: SchoolDashboardMetricTop[] = [];
      for (const metric of metrics) {
        const direction: PersonalBestComparisonMode = metric.isTimeBased
          ? 'lower_is_better'
          : 'higher_is_better';

        const candidates = latestRows
          .filter((s) => s.metricName === metric.metricName && s.seasonAvg != null)
          .sort((a, b) => {
            const aVal = Number(a.seasonAvg);
            const bVal = Number(b.seasonAvg);
            return direction === 'lower_is_better' ? aVal - bVal : bVal - aVal;
          })
          .slice(0, 3);

        if (candidates.length === 0) continue;

        topPerformersByMetric.push({
          metricName: metric.metricName,
          topPerformers: candidates.map((s) => {
            const student = rosterByStudentId.get(s.studentId)!;
            return {
              studentId: s.studentId,
              firstName: student.firstName,
              lastName: student.lastName,
              admissionNumber: student.admissionNumber,
              seasonAvg: Number(s.seasonAvg),
            };
          }),
        });
      }

      const distribution = { better: 0, worse: 0, similar: 0, noData: 0 };
      for (const s of latestRows) {
        if (s.yearOnYearFlag === YearOnYearFlag.BETTER) distribution.better += 1;
        else if (s.yearOnYearFlag === YearOnYearFlag.WORSE) distribution.worse += 1;
        else if (s.yearOnYearFlag === YearOnYearFlag.SIMILAR) distribution.similar += 1;
        else distribution.noData += 1;
      }

      rows.push({
        sportId: sport.id,
        sportName: sport.name,
        thisSeasonWinRate,
        lastSeasonWinRate,
        topPerformersByMetric,
        yearOnYearDistribution: distribution,
      });
    }

    return rows;
  }

  /** FR-P3-AV-07: the optional public board — team match results (Win/Loss/Draw + score) and
   * top-3 performer NAMES ONLY per metric, scoped to the sport's own current season
   * (seasonStart/seasonEnd), deliberately never per-match student metric values. Gated by the
   * School Settings toggle, checked here (not just hidden in the UI) so the data itself is never
   * served while disabled. */
  async getPublicSportsBoard(): Promise<PublicSportsBoardRow[]> {
    const enabled = await this.schoolSettingsService.isPublicSportsBoardEnabled();
    if (!enabled) {
      throw new NotFoundException('The public sports board is not enabled for this school.');
    }

    const sports = await this.sportRepo.find({ order: { name: 'ASC' } });
    const rows: PublicSportsBoardRow[] = [];

    for (const sport of sports) {
      const [matches, metrics, { roster }, snapshots] = await Promise.all([
        this.matchRepo.find({
          where: { sportId: sport.id, date: Between(sport.seasonStart, sport.seasonEnd) },
          order: { date: 'DESC' },
        }),
        this.sportMetricRepo.find({
          where: { sportTypeId: sport.sportTypeId },
          order: { ordering: 'ASC' },
        }),
        this.sportsService.getRoster(sport.id, '', true),
        this.snapshotRepo.find({ where: { sportId: sport.id }, order: { weekEnding: 'DESC' } }),
      ]);

      const rosterByStudentId = new Map(roster.map((r) => [r.studentId, r]));

      // Fetch-then-group-in-JS for "latest per (studentId, metricName)" — same convention as
      // getSchoolDashboard/findLatestSnapshots.
      const latestByKey = new Map<string, SportStudentSnapshotEntity>();
      for (const s of snapshots) {
        const key = `${s.studentId}::${s.metricName}`;
        if (!latestByKey.has(key)) latestByKey.set(key, s);
      }
      const latestRows = [...latestByKey.values()].filter((s) =>
        rosterByStudentId.has(s.studentId),
      );

      const topPerformersByMetric: PublicMetricTopPerformers[] = [];
      for (const metric of metrics) {
        const direction: PersonalBestComparisonMode = metric.isTimeBased
          ? 'lower_is_better'
          : 'higher_is_better';

        const candidates = latestRows
          .filter((s) => s.metricName === metric.metricName && s.seasonAvg != null)
          .sort((a, b) => {
            const aVal = Number(a.seasonAvg);
            const bVal = Number(b.seasonAvg);
            return direction === 'lower_is_better' ? aVal - bVal : bVal - aVal;
          })
          .slice(0, 3);

        if (candidates.length === 0) continue;

        topPerformersByMetric.push({
          metricName: metric.metricName,
          topPerformers: candidates.map((s) => {
            const student = rosterByStudentId.get(s.studentId)!;
            return { firstName: student.firstName, lastName: student.lastName };
          }),
        });
      }

      rows.push({
        sportId: sport.id,
        sportName: sport.name,
        sportType: sport.sportType.name,
        matchResults: matches.map((m) => ({
          matchId: m.id,
          date: m.date,
          opponent: m.opponent,
          matchType: m.matchType,
          teamResult: m.teamResult,
          teamScore: m.teamScore,
        })),
        topPerformersByMetric,
      });
    }

    return rows;
  }

  /** FR-P3-AV-05: a student's own latest-per-metric snapshot for one sport. Deliberately
   * bypasses getRoster/assertAuthorized (the coach-ownership check) — that's an orthogonal
   * authorization concern (is this caller the coach?) that doesn't apply to a self-view; access
   * control is enforced once, at the self-view controller layer, before this is called. */
  async findLatestSnapshotsForStudent(
    sportId: string,
    studentId: string,
  ): Promise<StudentMetricSnapshot[]> {
    const snapshots = await this.snapshotRepo.find({
      where: { sportId, studentId },
      order: { weekEnding: 'DESC' },
    });

    // Fetch-then-group-in-JS for "latest per metricName" — same convention as
    // findLatestSnapshots/getSchoolDashboard.
    const latestByMetric = new Map<string, SportStudentSnapshotEntity>();
    for (const s of snapshots) {
      if (!latestByMetric.has(s.metricName)) latestByMetric.set(s.metricName, s);
    }

    return [...latestByMetric.values()].map((s) => ({
      metricName: s.metricName,
      weekEnding: s.weekEnding,
      rollingAvg: s.rollingAvg,
      trendFlag: s.trendFlag,
      seasonAvg: s.seasonAvg,
      personalBest: s.personalBest,
      lastSeasonAvg: s.lastSeasonAvg != null ? Number(s.lastSeasonAvg) : null,
      yearOnYearFlag: s.yearOnYearFlag,
    }));
  }

  async findLatestSnapshots(
    sportId: string,
    staffId: string,
    isPrivilegedViewer: boolean,
  ): Promise<SnapshotRow[]> {
    const { roster } = await this.sportsService.getRoster(sportId, staffId, isPrivilegedViewer);
    const rosterByStudentId = new Map(roster.map((r) => [r.studentId, r]));

    const snapshots = await this.snapshotRepo.find({
      where: { sportId },
      order: { weekEnding: 'DESC' },
    });

    // Fetch-then-group-in-JS for "latest per (studentId, metricName)" — no .groupBy()
    // aggregation, matching this codebase's own repeated convention elsewhere.
    const latestByKey = new Map<string, SportStudentSnapshotEntity>();
    for (const s of snapshots) {
      const key = `${s.studentId}::${s.metricName}`;
      if (!latestByKey.has(key)) latestByKey.set(key, s);
    }

    const rows: SnapshotRow[] = [];
    for (const s of latestByKey.values()) {
      const student = rosterByStudentId.get(s.studentId);
      if (!student) continue; // no longer an active roster member
      rows.push({
        studentId: s.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        metricName: s.metricName,
        weekEnding: s.weekEnding,
        rollingAvg: s.rollingAvg,
        trendFlag: s.trendFlag,
        seasonAvg: s.seasonAvg,
        personalBest: s.personalBest,
        lastSeasonAvg: s.lastSeasonAvg != null ? Number(s.lastSeasonAvg) : null,
        yearOnYearFlag: s.yearOnYearFlag,
      });
    }
    return rows;
  }
}
