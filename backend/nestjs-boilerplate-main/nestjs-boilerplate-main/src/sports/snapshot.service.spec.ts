import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { SnapshotService } from './snapshot.service';
import {
  SportStudentSnapshotEntity,
  TrendFlag,
  YearOnYearFlag,
} from './entities/sport-student-snapshot.entity';
import { SportEntity } from './entities/sport.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import { MatchEntity, TeamResult } from './entities/match.entity';
import { CoachAlertEntity, CoachAlertType } from './entities/coach-alert.entity';
import {
  StudentMatchPerformanceEntity,
  PerformanceStatus,
} from './entities/student-match-performance.entity';
import { SportsService } from './sports.service';
import { SportEnrollmentEntity } from './entities/sport-enrollment.entity';
import { TrainingSessionEntity } from './entities/training-session.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { NotificationService } from '../notification/notification.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-snapshot-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  createQueryBuilder: jest.fn(),
});

const SPORT_ID = 'sport-uuid';
const STUDENT_A = 'student-a';
const COACH_ID = 'coach-uuid';

const SPORT_TYPE_ATHLETICS_TRACK = { id: 'st-athletics-track', name: 'Athletics — Track', isPersonalBestEligible: true };

const makeSport = (overrides: Partial<SportEntity> = {}): SportEntity =>
  ({
    id: SPORT_ID,
    name: 'Athletics',
    sportTypeId: SPORT_TYPE_ATHLETICS_TRACK.id,
    sportType: SPORT_TYPE_ATHLETICS_TRACK,
    seasonStart: new Date('2026-01-01'),
    seasonEnd: new Date('2026-12-31'),
    coachId: COACH_ID,
    ...overrides,
  } as SportEntity);

const ATHLETICS_TRACK_METRICS: SportMetricEntity[] = [
  { id: 'm1', sportTypeId: SPORT_TYPE_ATHLETICS_TRACK.id, metricName: 'Finish time', unit: 'seconds', isTimeBased: true, isDistanceBased: false, ordering: 1 } as SportMetricEntity,
  { id: 'm2', sportTypeId: SPORT_TYPE_ATHLETICS_TRACK.id, metricName: 'Rank/position', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 2 } as SportMetricEntity,
];

const makePerformance = (metricValues: Record<string, number>, matchDate: string): StudentMatchPerformanceEntity =>
  ({
    studentId: STUDENT_A,
    status: PerformanceStatus.SUBMITTED,
    metricValues,
    match: { date: new Date(matchDate) },
  } as unknown as StudentMatchPerformanceEntity);

describe('SnapshotService', () => {
  let service: SnapshotService;
  let snapshotRepo: MockRepo<SportStudentSnapshotEntity>;
  let sportRepo: MockRepo<SportEntity>;
  let sportMetricRepo: MockRepo<SportMetricEntity>;
  let performanceRepo: MockRepo<StudentMatchPerformanceEntity>;
  let matchRepo: MockRepo<MatchEntity>;
  let coachAlertRepo: MockRepo<CoachAlertEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let sportsService: { getRoster: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let configService: { get: jest.Mock };
  let schoolSettingsService: { isPublicSportsBoardEnabled: jest.Mock };
  let qbMock: {
    innerJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    snapshotRepo = repoMock<SportStudentSnapshotEntity>();
    sportRepo = repoMock<SportEntity>();
    sportMetricRepo = repoMock<SportMetricEntity>();
    performanceRepo = repoMock<StudentMatchPerformanceEntity>();
    matchRepo = repoMock<MatchEntity>();
    coachAlertRepo = repoMock<CoachAlertEntity>();
    studentRepo = repoMock<StudentEntity>();
    sportsService = { getRoster: jest.fn() };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn().mockReturnValue(10) };
    schoolSettingsService = { isPublicSportsBoardEnabled: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapshotService,
        { provide: getRepositoryToken(SportStudentSnapshotEntity), useValue: snapshotRepo },
        { provide: getRepositoryToken(SportEntity), useValue: sportRepo },
        { provide: getRepositoryToken(SportMetricEntity), useValue: sportMetricRepo },
        { provide: getRepositoryToken(StudentMatchPerformanceEntity), useValue: performanceRepo },
        { provide: getRepositoryToken(MatchEntity), useValue: matchRepo },
        { provide: getRepositoryToken(CoachAlertEntity), useValue: coachAlertRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: SportsService, useValue: sportsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: ConfigService, useValue: configService },
        { provide: SchoolSettingsService, useValue: schoolSettingsService },
      ],
    }).compile();

    service = module.get<SnapshotService>(SnapshotService);
    jest.clearAllMocks();

    sportRepo.find!.mockResolvedValue([makeSport()]);
    sportMetricRepo.find!.mockResolvedValue(ATHLETICS_TRACK_METRICS);
    notificationService.createForStaff.mockResolvedValue(undefined);
    configService.get.mockReturnValue(10);
    schoolSettingsService.isPublicSportsBoardEnabled.mockResolvedValue(true);
    studentRepo.findOne!.mockResolvedValue({ id: STUDENT_A, firstName: 'A', lastName: 'One' });

    qbMock = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    performanceRepo.createQueryBuilder!.mockReturnValue(qbMock);

    // Default snapshotRepo.findOne: an exact-weekEnding lookup (a real Date in the where clause)
    // returns "no existing row yet"; a prior-calendar-year lookup (a Between() FindOperator,
    // never a plain Date) returns "no prior-year data" — both default to undefined unless a
    // test overrides this to exercise the year-on-year path.
    snapshotRepo.findOne!.mockResolvedValue(undefined);
  });

  describe('computeAllSnapshots', () => {
    it('does nothing for a sport with no submitted performances', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.computeAllSnapshots();

      expect(snapshotRepo.save).not.toHaveBeenCalled();
    });

    it('computes and saves a snapshot per (student, metric) with the correct direction-aware trend', async () => {
      // 4 Finish-time results, improving (getting faster): prior pair avg 13.0, last pair avg 11.5
      qbMock.getMany.mockResolvedValue([
        makePerformance({ 'Finish time': 13.2 }, '2026-02-01'),
        makePerformance({ 'Finish time': 12.8 }, '2026-02-08'),
        makePerformance({ 'Finish time': 11.6 }, '2026-02-15'),
        makePerformance({ 'Finish time': 11.4 }, '2026-02-22'),
      ]);

      await service.computeAllSnapshots();

      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: STUDENT_A,
          sportId: SPORT_ID,
          metricName: 'Finish time',
          trendFlag: TrendFlag.IMPROVING,
          personalBest: 11.4,
        }),
      );
    });

    it('queries only SUBMITTED performances within the sport season', async () => {
      await service.computeAllSnapshots();

      expect(qbMock.where).toHaveBeenCalledWith('m.sportId = :sportId', { sportId: SPORT_ID });
      expect(qbMock.andWhere).toHaveBeenCalledWith('p.status = :status', {
        status: PerformanceStatus.SUBMITTED,
      });
    });

    it('updates an existing snapshot row for the same week instead of creating a duplicate', async () => {
      qbMock.getMany.mockResolvedValue([makePerformance({ 'Finish time': 12.0 }, '2026-02-01')]);
      const existing = { id: 'existing-snap', studentId: STUDENT_A, sportId: SPORT_ID, metricName: 'Finish time' };
      snapshotRepo.findOne!.mockImplementation((opts: { where: { weekEnding: unknown } }) =>
        Promise.resolve(opts.where.weekEnding instanceof Date ? existing : undefined),
      );

      await service.computeAllSnapshots();

      expect(snapshotRepo.create).not.toHaveBeenCalled();
      expect(snapshotRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-snap' }));
    });
  });

  describe('computeAllSnapshots — year-on-year comparison (FR-P3-PA-06)', () => {
    it('populates lastSeasonAvg and a direction-aware yearOnYearFlag from the prior calendar year\'s most recent snapshot', async () => {
      // This season: Finish time 11.5 avg (faster/better). Last season: 13.5 (numeric columns
      // round-trip through pg as strings — Number() coercion is exercised here deliberately).
      qbMock.getMany.mockResolvedValue([
        makePerformance({ 'Finish time': 11.5 }, '2026-03-01'),
      ]);
      snapshotRepo.findOne!.mockImplementation((opts: { where: { weekEnding: unknown } }) =>
        Promise.resolve(
          opts.where.weekEnding instanceof Date
            ? undefined
            : { seasonAvg: '13.50', weekEnding: new Date('2025-03-03') },
        ),
      );

      await service.computeAllSnapshots();

      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSeasonAvg: 13.5,
          yearOnYearFlag: YearOnYearFlag.BETTER,
        }),
      );
    });

    it('leaves lastSeasonAvg and yearOnYearFlag null when no prior-year snapshot exists', async () => {
      qbMock.getMany.mockResolvedValue([makePerformance({ 'Finish time': 11.5 }, '2026-03-01')]);
      // default snapshotRepo.findOne resolves undefined for every lookup

      await service.computeAllSnapshots();

      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastSeasonAvg: null, yearOnYearFlag: null }),
      );
    });

    it('reads the configured threshold percentage rather than a hardcoded 10%', async () => {
      configService.get.mockReturnValue(30);
      // (11.5 - 13.5)/13.5 ≈ -14.8% — Similar at a 30% threshold, Better at the default 10%
      qbMock.getMany.mockResolvedValue([makePerformance({ 'Finish time': 11.5 }, '2026-03-01')]);
      snapshotRepo.findOne!.mockImplementation((opts: { where: { weekEnding: unknown } }) =>
        Promise.resolve(
          opts.where.weekEnding instanceof Date
            ? undefined
            : { seasonAvg: '13.50', weekEnding: new Date('2025-03-03') },
        ),
      );

      await service.computeAllSnapshots();

      expect(snapshotRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ yearOnYearFlag: YearOnYearFlag.SIMILAR }),
      );
    });
  });

  describe('checkDecliningAlerts — the explicitly-requested 3-consecutive-declining alert trigger (FR-P3-PA-13)', () => {
    const declining3 = [
      { weekEnding: new Date('2026-03-02'), trendFlag: TrendFlag.DECLINING, rollingAvg: '14.50' },
      { weekEnding: new Date('2026-02-23'), trendFlag: TrendFlag.DECLINING, rollingAvg: '13.20' },
      { weekEnding: new Date('2026-02-16'), trendFlag: TrendFlag.DECLINING, rollingAvg: '12.10' },
    ];

    beforeEach(() => {
      qbMock.getMany.mockResolvedValue([makePerformance({ 'Finish time': 15.0 }, '2026-03-01')]);
    });

    it('creates a CoachAlert and notifies the coach when the last 3 snapshots are all Declining', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3);
      coachAlertRepo.findOne!.mockResolvedValue(undefined);

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: STUDENT_A,
          sportId: SPORT_ID,
          metricName: 'Finish time',
          alertType: CoachAlertType.DECLINING_TREND,
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        COACH_ID,
        expect.any(String),
        expect.any(String),
        'declining_trend',
      );
    });

    it('persists the last 3 declining rollingAvg values, oldest→newest — "the last 3 values showing the decline"', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3);
      coachAlertRepo.findOne!.mockResolvedValue(undefined);

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ declineValues: [12.1, 13.2, 14.5] }),
      );
    });

    it('includes the real student name, sport name, metric, and the 3 declining values in the notification message', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3);
      coachAlertRepo.findOne!.mockResolvedValue(undefined);
      studentRepo.findOne!.mockResolvedValue({ id: STUDENT_A, firstName: 'Kasun', lastName: 'Perera' });

      await service.computeAllSnapshots();

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        COACH_ID,
        expect.any(String),
        expect.stringContaining("Kasun Perera's Finish time performance in Athletics"),
        'declining_trend',
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        COACH_ID,
        expect.any(String),
        expect.stringContaining('12.1, 13.2, 14.5'),
        'declining_trend',
      );
    });

    it('does not alert when fewer than 3 snapshots exist yet', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3.slice(0, 2));

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not alert when only 2 of the last 3 snapshots are Declining', async () => {
      snapshotRepo.find!.mockResolvedValue([
        { weekEnding: new Date('2026-03-02'), trendFlag: TrendFlag.DECLINING },
        { weekEnding: new Date('2026-02-23'), trendFlag: TrendFlag.DECLINING },
        { weekEnding: new Date('2026-02-16'), trendFlag: TrendFlag.STABLE },
      ]);

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not duplicate an alert already created for the current declining streak', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3);
      // Alerted after the streak's start (2026-02-16) -> same streak, already handled.
      coachAlertRepo.findOne!.mockResolvedValue({ id: 'existing-alert', createdAt: new Date('2026-02-24') });

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('creates a fresh alert for a new declining streak that starts after an earlier alerted streak', async () => {
      snapshotRepo.find!.mockResolvedValue(declining3); // streak start = 2026-02-16
      // Prior alert predates this streak's start -> a genuinely new streak.
      coachAlertRepo.findOne!.mockResolvedValue({ id: 'old-alert', createdAt: new Date('2026-01-05') });

      await service.computeAllSnapshots();

      expect(coachAlertRepo.save).toHaveBeenCalled();
      expect(notificationService.createForStaff).toHaveBeenCalled();
    });
  });

  describe('getSchoolDashboard', () => {
    const ROSTER = [
      { studentId: STUDENT_A, firstName: 'A', lastName: 'One', admissionNumber: 'A1', enrolledAt: new Date() },
      { studentId: 'student-b', firstName: 'B', lastName: 'Two', admissionNumber: 'B1', enrolledAt: new Date() },
    ];

    beforeEach(() => {
      sportsService.getRoster.mockResolvedValue({ sport: makeSport(), roster: ROSTER });
    });

    it('computes win rate excluding NO_RESULT matches from the denominator', async () => {
      matchRepo.find!.mockResolvedValue([
        { teamResult: TeamResult.WIN },
        { teamResult: TeamResult.WIN },
        { teamResult: TeamResult.LOSS },
        { teamResult: TeamResult.NO_RESULT },
      ]);
      snapshotRepo.find!.mockResolvedValue([]);

      const result = await service.getSchoolDashboard();

      expect(result[0].thisSeasonWinRate).toBeCloseTo(2 / 3);
    });

    it('returns null (not zero) win rate when there are no decided matches that year', async () => {
      matchRepo.find!.mockResolvedValue([]);
      snapshotRepo.find!.mockResolvedValue([]);

      const result = await service.getSchoolDashboard();

      expect(result[0].thisSeasonWinRate).toBeNull();
      expect(result[0].lastSeasonWinRate).toBeNull();
    });

    it('ranks top performers per metric direction-aware and tallies the yearOnYearFlag distribution', async () => {
      matchRepo.find!.mockResolvedValue([]);
      snapshotRepo.find!.mockResolvedValue([
        { studentId: STUDENT_A, metricName: 'Finish time', seasonAvg: '11.20', weekEnding: new Date('2026-03-01'), yearOnYearFlag: YearOnYearFlag.BETTER },
        { studentId: 'student-b', metricName: 'Finish time', seasonAvg: '10.80', weekEnding: new Date('2026-03-01'), yearOnYearFlag: YearOnYearFlag.WORSE },
      ]);

      const result = await service.getSchoolDashboard();

      const finishTimeTop = result[0].topPerformersByMetric.find((m) => m.metricName === 'Finish time');
      // lower_is_better: 10.80 (student-b) outranks 11.20 (student A)
      expect(finishTimeTop?.topPerformers[0].studentId).toBe('student-b');
      expect(result[0].yearOnYearDistribution).toEqual({ better: 1, worse: 1, similar: 0, noData: 0 });
    });

    it('excludes students no longer on the active roster from top performers and the distribution', async () => {
      matchRepo.find!.mockResolvedValue([]);
      snapshotRepo.find!.mockResolvedValue([
        { studentId: 'graduated-student', metricName: 'Finish time', seasonAvg: '9.00', weekEnding: new Date('2026-03-01'), yearOnYearFlag: YearOnYearFlag.BETTER },
      ]);

      const result = await service.getSchoolDashboard();

      expect(result[0].topPerformersByMetric).toEqual([]);
      expect(result[0].yearOnYearDistribution).toEqual({ better: 0, worse: 0, similar: 0, noData: 0 });
    });
  });

  describe('findLatestSnapshots', () => {
    it('returns only the newest weekEnding row per (student, metric)', async () => {
      sportsService.getRoster.mockResolvedValue({
        sport: makeSport(),
        roster: [{ studentId: STUDENT_A, firstName: 'A', lastName: 'One', admissionNumber: 'A1', enrolledAt: new Date() }],
      });
      snapshotRepo.find!.mockResolvedValue([
        { studentId: STUDENT_A, sportId: SPORT_ID, metricName: 'Finish time', weekEnding: new Date('2026-02-16'), trendFlag: TrendFlag.IMPROVING, rollingAvg: 11.5, seasonAvg: 12.0, personalBest: 11.4, lastSeasonAvg: '13.00', yearOnYearFlag: YearOnYearFlag.BETTER },
        { studentId: STUDENT_A, sportId: SPORT_ID, metricName: 'Finish time', weekEnding: new Date('2026-02-09'), trendFlag: TrendFlag.STABLE, rollingAvg: 12.5, seasonAvg: 12.5, personalBest: 12.0, lastSeasonAvg: null, yearOnYearFlag: null },
      ]);

      const result = await service.findLatestSnapshots(SPORT_ID, 'coach-uuid', false);

      expect(result).toHaveLength(1);
      expect(result[0].weekEnding).toEqual(new Date('2026-02-16'));
      expect(result[0].trendFlag).toBe(TrendFlag.IMPROVING);
      expect(result[0].lastSeasonAvg).toBe(13);
      expect(result[0].yearOnYearFlag).toBe(YearOnYearFlag.BETTER);
    });

    it('excludes a snapshot for a student no longer on the active roster', async () => {
      sportsService.getRoster.mockResolvedValue({ sport: makeSport(), roster: [] });
      snapshotRepo.find!.mockResolvedValue([
        { studentId: STUDENT_A, sportId: SPORT_ID, metricName: 'Finish time', weekEnding: new Date('2026-02-16') },
      ]);

      const result = await service.findLatestSnapshots(SPORT_ID, 'coach-uuid', false);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPublicSportsBoard (FR-P3-AV-07)', () => {
    const ROSTER = [
      { studentId: STUDENT_A, firstName: 'A', lastName: 'One', admissionNumber: 'A1', enrolledAt: new Date() },
      { studentId: 'student-b', firstName: 'B', lastName: 'Two', admissionNumber: 'B1', enrolledAt: new Date() },
    ];

    beforeEach(() => {
      sportsService.getRoster.mockResolvedValue({ sport: makeSport(), roster: ROSTER });
    });

    it('throws NotFoundException when the school-settings toggle is disabled — never serves data while off', async () => {
      schoolSettingsService.isPublicSportsBoardEnabled.mockResolvedValue(false);

      await expect(service.getPublicSportsBoard()).rejects.toThrow(NotFoundException);
    });

    it('returns match results and top-3 performer NAMES ONLY — no seasonAvg or admissionNumber, the "no individual detailed metrics" restriction', async () => {
      matchRepo.find!.mockResolvedValue([
        {
          id: 'match-1',
          date: new Date('2026-03-01'),
          opponent: 'Royal College',
          matchType: 'friendly',
          teamResult: TeamResult.WIN,
          teamScore: '2-1',
        },
      ]);
      snapshotRepo.find!.mockResolvedValue([
        { studentId: STUDENT_A, metricName: 'Finish time', seasonAvg: '11.20', weekEnding: new Date('2026-03-01') },
        { studentId: 'student-b', metricName: 'Finish time', seasonAvg: '10.80', weekEnding: new Date('2026-03-01') },
      ]);

      const result = await service.getPublicSportsBoard();

      expect(result[0].matchResults).toEqual([
        {
          matchId: 'match-1',
          date: new Date('2026-03-01'),
          opponent: 'Royal College',
          matchType: 'friendly',
          teamResult: TeamResult.WIN,
          teamScore: '2-1',
        },
      ]);
      const finishTimeTop = result[0].topPerformersByMetric.find((m) => m.metricName === 'Finish time');
      // lower_is_better: 10.80 (student-b) outranks 11.20 (student A)
      expect(finishTimeTop?.topPerformers[0]).toEqual({ firstName: 'B', lastName: 'Two' });
      expect(finishTimeTop?.topPerformers[0]).not.toHaveProperty('seasonAvg');
      expect(finishTimeTop?.topPerformers[0]).not.toHaveProperty('admissionNumber');
      expect(finishTimeTop?.topPerformers[0]).not.toHaveProperty('studentId');
    });

    it("scopes match results to the sport's own current season window, not a calendar year", async () => {
      matchRepo.find!.mockResolvedValue([]);
      snapshotRepo.find!.mockResolvedValue([]);

      await service.getPublicSportsBoard();

      expect(matchRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ sportId: SPORT_ID }) }),
      );
    });
  });

  describe('cross-service authorization — the explicitly-requested integration test (FR-P3-AV-03)', () => {
    // Wires a REAL SportsService (mocked repos only, not a mocked service) alongside
    // SnapshotService, so findLatestSnapshots's call into the real getRoster/assertAuthorized
    // genuinely executes and rejects — the other describe blocks in this file mock SportsService
    // entirely away, which never exercises this rejection path at all.
    let realService: SnapshotService;

    beforeEach(async () => {
      const realSportRepo = repoMock<SportEntity>();
      const realEnrollmentRepo = repoMock<SportEnrollmentEntity>();
      const realStaffRepo = repoMock<StaffEntity>();
      const realStudentRepo = repoMock<StudentEntity>();
      const realMatchRepo = repoMock<MatchEntity>();
      const realTrainingSessionRepo = repoMock<TrainingSessionEntity>();
      const realSnapshotRepo = repoMock<SportStudentSnapshotEntity>();
      const realSportMetricRepo = repoMock<SportMetricEntity>();
      const realPerformanceRepo = repoMock<StudentMatchPerformanceEntity>();
      const realCoachAlertRepo = repoMock<CoachAlertEntity>();
      const realSportTypeRepo = repoMock<SportTypeEntity>();

      realSportRepo.findOne!.mockResolvedValue(makeSport());
      realEnrollmentRepo.find!.mockResolvedValue([
        {
          studentId: STUDENT_A,
          enrolledAt: new Date(),
          student: { firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
        },
      ]);
      realSnapshotRepo.find!.mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SnapshotService,
          SportsService,
          { provide: getRepositoryToken(SportStudentSnapshotEntity), useValue: realSnapshotRepo },
          { provide: getRepositoryToken(SportEntity), useValue: realSportRepo },
          { provide: getRepositoryToken(SportTypeEntity), useValue: realSportTypeRepo },
          { provide: getRepositoryToken(SportMetricEntity), useValue: realSportMetricRepo },
          { provide: getRepositoryToken(StudentMatchPerformanceEntity), useValue: realPerformanceRepo },
          { provide: getRepositoryToken(MatchEntity), useValue: realMatchRepo },
          { provide: getRepositoryToken(CoachAlertEntity), useValue: realCoachAlertRepo },
          { provide: getRepositoryToken(SportEnrollmentEntity), useValue: realEnrollmentRepo },
          { provide: getRepositoryToken(StaffEntity), useValue: realStaffRepo },
          { provide: getRepositoryToken(StudentEntity), useValue: realStudentRepo },
          { provide: getRepositoryToken(TrainingSessionEntity), useValue: realTrainingSessionRepo },
          { provide: NotificationService, useValue: { createForStaff: jest.fn() } },
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
          { provide: SchoolSettingsService, useValue: { isPublicSportsBoardEnabled: jest.fn() } },
        ],
      }).compile();

      realService = module.get<SnapshotService>(SnapshotService);
    });

    it('propagates a real ForbiddenException for a non-coach, non-privileged caller', async () => {
      await expect(
        realService.findLatestSnapshots(SPORT_ID, 'some-other-staff-id', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("succeeds for the sport's real assigned coach", async () => {
      await expect(
        realService.findLatestSnapshots(SPORT_ID, COACH_ID, false),
      ).resolves.toBeDefined();
    });
  });

  describe('findAlertsForCoach (FR-P3-PA-13)', () => {
    const makeAlertQbMock = (rows: unknown[]) => {
      const getMany = jest.fn().mockResolvedValue(rows);
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany,
      };
      (coachAlertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      return qb;
    };

    const alertRow = {
      id: 'alert-1',
      studentId: STUDENT_A,
      sportId: SPORT_ID,
      metricName: 'Finish time',
      declineValues: [12.1, 13.2, 14.5],
      acknowledgedAt: null,
      acknowledgedByStaffId: null,
      createdAt: new Date('2026-03-02'),
      student: { firstName: 'A', lastName: 'One' },
      sport: { name: 'Athletics' },
    };

    it('returns every alert, unfiltered by coach, for a fully privileged caller', async () => {
      const qb = makeAlertQbMock([alertRow]);

      const result = await service.findAlertsForCoach('admin-staff-id', true);

      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('sport.coachId'),
        expect.anything(),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ firstName: 'A', lastName: 'One', sportName: 'Athletics' }),
      );
    });

    it("filters to only the caller's own coached sport(s) for a non-privileged caller", async () => {
      const qb = makeAlertQbMock([alertRow]);

      await service.findAlertsForCoach(COACH_ID, false);

      expect(qb.andWhere).toHaveBeenCalledWith('sport.coachId = :staffId', { staffId: COACH_ID });
    });

    it('applies the acknowledged filter when provided', async () => {
      const qb = makeAlertQbMock([]);

      await service.findAlertsForCoach(COACH_ID, false, false);

      expect(qb.andWhere).toHaveBeenCalledWith('a.acknowledgedAt IS NULL');
    });
  });

  describe('acknowledgeAlert (FR-P3-PA-13)', () => {
    it('sets acknowledgedAt/acknowledgedByStaffId when the caller is the sport\'s own coach', async () => {
      coachAlertRepo.findOne!.mockResolvedValue({ id: 'alert-1', sportId: SPORT_ID });
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await service.acknowledgeAlert('alert-1', COACH_ID, false);

      expect(coachAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          acknowledgedAt: expect.any(Date),
          acknowledgedByStaffId: COACH_ID,
        }),
      );
    });

    it('succeeds for a fully privileged caller regardless of coach assignment', async () => {
      coachAlertRepo.findOne!.mockResolvedValue({ id: 'alert-1', sportId: SPORT_ID });

      await expect(
        service.acknowledgeAlert('alert-1', 'admin-staff-id', true),
      ).resolves.toBeDefined();
      expect(sportRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for a non-coach, non-privileged caller', async () => {
      coachAlertRepo.findOne!.mockResolvedValue({ id: 'alert-1', sportId: SPORT_ID });
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(
        service.acknowledgeAlert('alert-1', 'someone-else', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for an unknown alert id', async () => {
      coachAlertRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert('missing-alert', COACH_ID, false),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
