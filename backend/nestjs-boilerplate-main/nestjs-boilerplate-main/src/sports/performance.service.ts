import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  StudentMatchPerformanceEntity,
  PerformanceStatus,
} from './entities/student-match-performance.entity';
import { MatchEntity } from './entities/match.entity';
import { SportEntity } from './entities/sport.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import { SportsService } from './sports.service';
import { BulkUpsertPerformanceDto } from './dto/bulk-upsert-performance.dto';
import { isPersonalBest, validateMetricValue } from './utils/performance-rules';

const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface PerformanceRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  performanceId: string | null;
  status: PerformanceStatus | null;
  metricValues: Record<string, number>;
  personalBests: Record<string, boolean>;
  canEdit: boolean;
}

export interface PerformanceEntryGridResult {
  match: MatchEntity;
  metrics: SportMetricEntity[];
  roster: PerformanceRosterRow[];
}

export interface MatchHistoryRow {
  matchId: string;
  date: Date;
  opponent: string | null;
  venue: string;
  matchType: MatchEntity['matchType'];
  teamResult: MatchEntity['teamResult'];
  metricValues: Record<string, number>;
  personalBests: Record<string, boolean>;
}

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(StudentMatchPerformanceEntity)
    private readonly performanceRepo: Repository<StudentMatchPerformanceEntity>,

    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,

    @InjectRepository(SportMetricEntity)
    private readonly sportMetricRepo: Repository<SportMetricEntity>,

    private readonly sportsService: SportsService,
    private readonly dataSource: DataSource,
  ) {}

  private async findMatchForSport(sportId: string, matchId: string): Promise<MatchEntity> {
    const match = await this.matchRepo.findOne({ where: { id: matchId, sportId } });
    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found for this sport.`);
    }
    return match;
  }

  /** Personal-best is compared only against this student's OTHER records from strictly
   * earlier-dated matches for the same sport, within the sport's current season — "prior
   * records" (FR-P3-MR-07) read literally, chronologically. A record from the same match
   * (same date) is never "prior" to itself, so no explicit self-exclusion is needed. */
  private async computePersonalBests(
    sport: SportEntity,
    studentId: string,
    matchDate: Date,
    metricValues: Record<string, number>,
  ): Promise<Record<string, boolean>> {
    // FR-P3-MR-07: "For time/distance/height sports (Athletics, Swimming)" — now a per-type
    // data flag (SportTypeEntity.isPersonalBestEligible) instead of a hardcoded Set, so a
    // newly admin-added sport type can opt in without a code change.
    if (!sport.sportType.isPersonalBestEligible) return {};

    const metrics = await this.sportMetricRepo.find({ where: { sportTypeId: sport.sportTypeId } });
    const eligibleMetrics = metrics.filter((m) => {
      if (m.isTimeBased) return true;
      // Distance-based (higher-is-better) comparison only makes sense where "distance" IS
      // the result to maximize (Athletics Field). Swimming's own "Distance" metric means
      // race category (e.g. 50m vs 100m), not a performance to maximize — deliberately
      // excluded here even though it's flagged isDistanceBased in the seeded config. Kept as a
      // name check (not generalized into another data flag) since this is a narrow quirk of one
      // specific legacy sport type's metric semantics, not a pattern a newly admin-added type
      // would ever trigger.
      if (m.isDistanceBased) return sport.sportType.name === 'Athletics — Field';
      return false;
    });
    if (eligibleMetrics.length === 0) return {};

    const priorRecords = await this.performanceRepo
      .createQueryBuilder('p')
      .innerJoin('p.match', 'm')
      .where('m.sportId = :sportId', { sportId: sport.id })
      .andWhere('p.studentId = :studentId', { studentId })
      .andWhere('m.date < :matchDate', { matchDate })
      .andWhere('m.date >= :seasonStart', { seasonStart: sport.seasonStart })
      .andWhere('m.date <= :seasonEnd', { seasonEnd: sport.seasonEnd })
      .getMany();

    const personalBests: Record<string, boolean> = {};
    for (const metric of eligibleMetrics) {
      const currentValue = metricValues[metric.metricName];
      if (currentValue === undefined || currentValue === null) continue;
      const priorValues = priorRecords
        .map((r) => r.metricValues[metric.metricName])
        .filter((v): v is number => v !== undefined && v !== null);
      personalBests[metric.metricName] = isPersonalBest(
        currentValue,
        priorValues,
        metric.isTimeBased ? 'lower_is_better' : 'higher_is_better',
      );
    }
    return personalBests;
  }

  /** FR-P3-AV-05: a student's own match-by-match history for one sport — only SUBMITTED
   * performances count (same data-quality rule as SnapshotService/ResultComputationService;
   * a coach's still-editable draft isn't a real result yet), scoped to the sport's own
   * seasonStart/seasonEnd — the only season boundary that exists given the disclosed
   * FR-P3-SS-05 gap (no season-archiving entity; one Sport row is one ongoing season). No
   * authorization check here — the caller is authorized once at the self-view controller layer
   * before this is called, same as findEnrolledSports/findLatestSnapshotsForStudent. */
  async findMatchHistoryForStudent(
    sportId: string,
    studentId: string,
  ): Promise<MatchHistoryRow[]> {
    const sport = await this.sportsService.findById(sportId);

    const performances = await this.performanceRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.match', 'm')
      .where('m.sportId = :sportId', { sportId })
      .andWhere('p.studentId = :studentId', { studentId })
      .andWhere('p.status = :status', { status: PerformanceStatus.SUBMITTED })
      .andWhere('m.date >= :seasonStart', { seasonStart: sport.seasonStart })
      .andWhere('m.date <= :seasonEnd', { seasonEnd: sport.seasonEnd })
      .orderBy('m.date', 'DESC')
      .getMany();

    return performances.map((p) => ({
      matchId: p.matchId,
      date: p.match.date,
      opponent: p.match.opponent,
      venue: p.match.venue,
      matchType: p.match.matchType,
      teamResult: p.match.teamResult,
      metricValues: p.metricValues,
      personalBests: p.personalBests,
    }));
  }

  async findEntryGrid(
    sportId: string,
    matchId: string,
    staffId: string,
    isPrivilegedViewer: boolean,
  ): Promise<PerformanceEntryGridResult> {
    const sport = await this.sportsService.resolveSportForViewing(
      sportId,
      staffId,
      isPrivilegedViewer,
    );
    const match = await this.findMatchForSport(sportId, matchId);

    const { roster } = await this.sportsService.getRoster(sportId, staffId, isPrivilegedViewer);

    const metrics = await this.sportMetricRepo.find({
      where: { sportTypeId: sport.sportTypeId },
      order: { ordering: 'ASC' },
    });

    const performances = await this.performanceRepo.find({ where: { matchId } });
    const performanceByStudentId = new Map(performances.map((p) => [p.studentId, p]));

    const now = Date.now();
    const rosterRows: PerformanceRosterRow[] = roster.map((r) => {
      const performance = performanceByStudentId.get(r.studentId);
      const withinWindow =
        !!performance?.submittedAt &&
        now - new Date(performance.submittedAt).getTime() <= EDIT_WINDOW_MS;
      const canEdit =
        !performance ||
        performance.status === PerformanceStatus.DRAFT ||
        performance.adminOverrideGranted ||
        withinWindow;

      return {
        studentId: r.studentId,
        firstName: r.firstName,
        lastName: r.lastName,
        admissionNumber: r.admissionNumber,
        performanceId: performance?.id ?? null,
        status: performance?.status ?? null,
        metricValues: performance?.metricValues ?? {},
        personalBests: performance?.personalBests ?? {},
        canEdit,
      };
    });

    return { match, metrics, roster: rosterRows };
  }

  async bulkUpsertPerformance(
    sportId: string,
    matchId: string,
    dto: BulkUpsertPerformanceDto,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<StudentMatchPerformanceEntity[]> {
    const sport = await this.sportsService.resolveSportForMatchManagement(
      sportId,
      staffId,
      isMatchManager,
    );
    const match = await this.findMatchForSport(sportId, matchId);

    const metrics = await this.sportMetricRepo.find({ where: { sportTypeId: sport.sportTypeId } });
    const metricByName = new Map(metrics.map((m) => [m.metricName, m]));

    // FR-P3-MR-06 "Partial Entry Allowed" — a student with no metricValues at all is simply
    // omitted, matching this project's established "skip blank rows" convention.
    const nonBlankEntries = dto.entries.filter((e) => Object.keys(e.metricValues).length > 0);
    if (nonBlankEntries.length === 0) {
      throw new UnprocessableEntityException(
        'At least one student must have a metric value entered.',
      );
    }

    const violations: { studentId: string; metricName: string; value: number; message: string }[] = [];
    for (const entry of nonBlankEntries) {
      for (const [metricName, value] of Object.entries(entry.metricValues)) {
        const metric = metricByName.get(metricName);
        if (!metric) {
          violations.push({
            studentId: entry.studentId,
            metricName,
            value,
            message: `"${metricName}" is not a recognized metric for this sport.`,
          });
          continue;
        }
        const error = validateMetricValue(value, metric);
        if (error) {
          violations.push({ studentId: entry.studentId, metricName, value, message: error });
        }
      }
    }
    if (violations.length > 0) {
      throw new UnprocessableEntityException({
        message: `${violations.length} metric value${violations.length === 1 ? '' : 's'} failed validation.`,
        violations,
      });
    }

    const existing = await this.performanceRepo.find({ where: { matchId } });
    const existingByStudentId = new Map(existing.map((p) => [p.studentId, p]));

    const now = Date.now();
    const lockedStudentIds: string[] = [];
    for (const entry of nonBlankEntries) {
      const record = existingByStudentId.get(entry.studentId);
      if (!record || record.status !== PerformanceStatus.SUBMITTED || record.adminOverrideGranted) {
        continue;
      }
      const withinWindow =
        !!record.submittedAt && now - new Date(record.submittedAt).getTime() <= EDIT_WINDOW_MS;
      if (!withinWindow) lockedStudentIds.push(entry.studentId);
    }
    if (lockedStudentIds.length > 0) {
      throw new ForbiddenException(
        `Performance was submitted more than 48 hours ago for ${lockedStudentIds.length} student(s) and is locked. Ask an Admin/Principal to grant an edit override.`,
      );
    }

    // Coordinated multi-row write needs atomicity, matching AssessmentService.create()'s and
    // MarkService.bulkUpsert()'s established dataSource.transaction() convention.
    return this.dataSource.transaction(async (manager) => {
      const performanceRepo = manager.getRepository(StudentMatchPerformanceEntity);
      const saved: StudentMatchPerformanceEntity[] = [];

      for (const entry of nonBlankEntries) {
        const record =
          existingByStudentId.get(entry.studentId) ??
          performanceRepo.create({ matchId, studentId: entry.studentId });

        const personalBests = await this.computePersonalBests(
          sport,
          entry.studentId,
          match.date,
          entry.metricValues,
        );

        record.metricValues = entry.metricValues;
        record.personalBests = personalBests;
        record.enteredByStaffId = staffId;
        if (record.adminOverrideGranted) {
          record.adminOverrideGranted = false;
        }
        // A brand-new row from performanceRepo.create() has submittedAt as `undefined`, not
        // `null` (TypeORM only returns a real `null` once the row round-trips through the DB) —
        // a falsy check catches both, so the very first submit is never silently skipped.
        if (dto.status === PerformanceStatus.SUBMITTED && !record.submittedAt) {
          record.submittedAt = new Date();
        }
        record.status = dto.status;

        saved.push(await performanceRepo.save(record));
      }
      return saved;
    });
  }

  async grantOverride(
    performanceId: string,
    staffId: string,
  ): Promise<StudentMatchPerformanceEntity> {
    const record = await this.performanceRepo.findOne({ where: { id: performanceId } });
    if (!record) {
      throw new NotFoundException(`Performance record ${performanceId} not found.`);
    }

    record.adminOverrideGranted = true;
    record.adminOverrideGrantedByStaffId = staffId;
    record.adminOverrideGrantedAt = new Date();
    return this.performanceRepo.save(record);
  }
}
