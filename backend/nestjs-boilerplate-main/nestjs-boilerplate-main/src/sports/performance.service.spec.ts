import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { PerformanceService } from './performance.service';
import {
  StudentMatchPerformanceEntity,
  PerformanceStatus,
} from './entities/student-match-performance.entity';
import { MatchEntity, MatchType, TeamResult } from './entities/match.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import { SportEntity } from './entities/sport.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEnrollmentEntity } from './entities/sport-enrollment.entity';
import { TrainingSessionEntity } from './entities/training-session.entity';
import { SportsService } from './sports.service';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { BulkUpsertPerformanceDto } from './dto/bulk-upsert-performance.dto';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-perf-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  createQueryBuilder: jest.fn(),
});

const SPORT_ID = 'sport-uuid';
const MATCH_ID = 'match-uuid';
const COACH_ID = 'coach-uuid';
const STUDENT_A = 'student-a';
const STUDENT_B = 'student-b';

const HOUR_MS = 60 * 60 * 1000;

const SPORT_TYPE_TIMESTAMPS = { createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
const SPORT_TYPE_ATHLETICS_TRACK = { id: 'st-athletics-track', name: 'Athletics — Track', isPersonalBestEligible: true, ...SPORT_TYPE_TIMESTAMPS };
const SPORT_TYPE_CRICKET = { id: 'st-cricket', name: 'Cricket', isPersonalBestEligible: false, ...SPORT_TYPE_TIMESTAMPS };
const SPORT_TYPE_SWIMMING = { id: 'st-swimming', name: 'Swimming', isPersonalBestEligible: true, ...SPORT_TYPE_TIMESTAMPS };

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

const makeMatch = (overrides: Partial<MatchEntity> = {}): MatchEntity =>
  ({
    id: MATCH_ID,
    sportId: SPORT_ID,
    date: new Date('2026-08-15'),
    venue: 'Stadium',
    matchType: MatchType.TOURNAMENT,
    teamResult: TeamResult.NO_RESULT,
    ...overrides,
  } as MatchEntity);

const ATHLETICS_TRACK_METRICS: SportMetricEntity[] = [
  { id: 'm1', sportTypeId: SPORT_TYPE_ATHLETICS_TRACK.id, metricName: 'Finish time', unit: 'seconds', isTimeBased: true, isDistanceBased: false, ordering: 1 } as SportMetricEntity,
  { id: 'm2', sportTypeId: SPORT_TYPE_ATHLETICS_TRACK.id, metricName: 'Rank/position', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 2 } as SportMetricEntity,
];

const CRICKET_METRICS: SportMetricEntity[] = [
  { id: 'm3', sportTypeId: SPORT_TYPE_CRICKET.id, metricName: 'Runs scored', unit: 'runs', isTimeBased: false, isDistanceBased: false, ordering: 1 } as SportMetricEntity,
];

const SWIMMING_METRICS: SportMetricEntity[] = [
  { id: 'm4', sportTypeId: SPORT_TYPE_SWIMMING.id, metricName: 'Finish time', unit: 'seconds', isTimeBased: true, isDistanceBased: false, ordering: 1 } as SportMetricEntity,
  { id: 'm5', sportTypeId: SPORT_TYPE_SWIMMING.id, metricName: 'Distance', unit: 'metres', isTimeBased: false, isDistanceBased: true, ordering: 2 } as SportMetricEntity,
];

const makePerformance = (overrides: Partial<StudentMatchPerformanceEntity> = {}): StudentMatchPerformanceEntity =>
  ({
    id: 'perf-uuid',
    matchId: MATCH_ID,
    studentId: STUDENT_A,
    metricValues: {},
    personalBests: {},
    status: PerformanceStatus.DRAFT,
    submittedAt: null,
    adminOverrideGranted: false,
    adminOverrideGrantedByStaffId: null,
    adminOverrideGrantedAt: null,
    enteredByStaffId: COACH_ID,
    ...overrides,
  } as StudentMatchPerformanceEntity);

const makeDto = (overrides: Partial<BulkUpsertPerformanceDto> = {}): BulkUpsertPerformanceDto => ({
  status: PerformanceStatus.DRAFT,
  entries: [{ studentId: STUDENT_A, metricValues: { 'Finish time': 12.1 } }],
  ...overrides,
});

describe('PerformanceService', () => {
  let service: PerformanceService;
  let performanceRepo: MockRepo<StudentMatchPerformanceEntity>;
  let matchRepo: MockRepo<MatchEntity>;
  let sportMetricRepo: MockRepo<SportMetricEntity>;
  let sportsService: {
    resolveSportForViewing: jest.Mock;
    resolveSportForMatchManagement: jest.Mock;
    getRoster: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let qbMock: { innerJoin: jest.Mock; where: jest.Mock; andWhere: jest.Mock; getMany: jest.Mock };

  beforeEach(async () => {
    performanceRepo = repoMock<StudentMatchPerformanceEntity>();
    matchRepo = repoMock<MatchEntity>();
    sportMetricRepo = repoMock<SportMetricEntity>();

    sportsService = {
      resolveSportForViewing: jest.fn().mockResolvedValue(makeSport()),
      resolveSportForMatchManagement: jest.fn().mockResolvedValue(makeSport()),
      getRoster: jest.fn().mockResolvedValue({
        sport: makeSport(),
        roster: [
          { studentId: STUDENT_A, firstName: 'A', lastName: 'One', admissionNumber: 'A1', enrolledAt: new Date() },
          { studentId: STUDENT_B, firstName: 'B', lastName: 'Two', admissionNumber: 'A2', enrolledAt: new Date() },
        ],
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({ getRepository: () => performanceRepo }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: getRepositoryToken(StudentMatchPerformanceEntity), useValue: performanceRepo },
        { provide: getRepositoryToken(MatchEntity), useValue: matchRepo },
        { provide: getRepositoryToken(SportMetricEntity), useValue: sportMetricRepo },
        { provide: SportsService, useValue: sportsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    jest.clearAllMocks();

    matchRepo.findOne!.mockResolvedValue(makeMatch());
    sportMetricRepo.find!.mockResolvedValue(ATHLETICS_TRACK_METRICS);
    performanceRepo.find!.mockResolvedValue([]);

    qbMock = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    performanceRepo.createQueryBuilder!.mockReturnValue(qbMock);
  });

  describe('bulkUpsertPerformance — validation and skip-blank-rows (FR-P3-MR-06/08)', () => {
    it('skips a student with no metricValues at all — the skip-blank-rows convention', async () => {
      const dto = makeDto({
        entries: [
          { studentId: STUDENT_A, metricValues: { 'Finish time': 12.1 } },
          { studentId: STUDENT_B, metricValues: {} },
        ],
      });

      const result = await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false);

      expect(result).toHaveLength(1);
      expect(performanceRepo.create).toHaveBeenCalledTimes(1);
      expect((performanceRepo.create as jest.Mock).mock.calls[0][0]).toMatchObject({ studentId: STUDENT_A });
    });

    it('rejects an entry list where every student is blank', async () => {
      const dto = makeDto({ entries: [{ studentId: STUDENT_A, metricValues: {} }] });

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects an unrecognized metric key', async () => {
      const dto = makeDto({ entries: [{ studentId: STUDENT_A, metricValues: { 'Not A Real Metric': 5 } }] });

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(performanceRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a negative value for a plain count metric', async () => {
      sportMetricRepo.find!.mockResolvedValue(CRICKET_METRICS);
      const dto = makeDto({ entries: [{ studentId: STUDENT_A, metricValues: { 'Runs scored': -5 } }] });

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a zero value for a time-based metric', async () => {
      const dto = makeDto({ entries: [{ studentId: STUDENT_A, metricValues: { 'Finish time': 0 } }] });

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException when the match does not belong to this sport', async () => {
      matchRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not the assigned coach and not a match manager', async () => {
      sportsService.resolveSportForMatchManagement.mockRejectedValue(new ForbiddenException());

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), 'someone-else', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulkUpsertPerformance — the explicitly-requested 48-hour edit window test', () => {
    it('allows editing a submitted record within 48 hours with no override needed', async () => {
      performanceRepo.find!.mockResolvedValue([
        {
          id: 'perf-1',
          studentId: STUDENT_A,
          matchId: MATCH_ID,
          status: PerformanceStatus.SUBMITTED,
          submittedAt: new Date(Date.now() - 10 * HOUR_MS),
          adminOverrideGranted: false,
          metricValues: {},
        } as StudentMatchPerformanceEntity,
      ]);

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false),
      ).resolves.toBeDefined();
    });

    it('sets submittedAt on a brand-new record submitted directly with no prior draft — regression test for a real bug caught via live QA (a freshly-created row has submittedAt as `undefined`, not `null`, so an `=== null` check silently skipped it)', async () => {
      performanceRepo.find!.mockResolvedValue([]); // no existing row — this is a first-time submit

      await service.bulkUpsertPerformance(
        SPORT_ID,
        MATCH_ID,
        makeDto({ status: PerformanceStatus.SUBMITTED }),
        COACH_ID,
        false,
      );

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ submittedAt: expect.any(Date) }),
      );
    });

    it('throws ForbiddenException editing a submitted record more than 48 hours later, without an override', async () => {
      performanceRepo.find!.mockResolvedValue([
        {
          id: 'perf-1',
          studentId: STUDENT_A,
          matchId: MATCH_ID,
          status: PerformanceStatus.SUBMITTED,
          submittedAt: new Date(Date.now() - 49 * HOUR_MS),
          adminOverrideGranted: false,
          metricValues: {},
        } as StudentMatchPerformanceEntity,
      ]);

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the edit past 48 hours when adminOverrideGranted is true, and consumes the flag afterward', async () => {
      const existingRecord = {
        id: 'perf-1',
        studentId: STUDENT_A,
        matchId: MATCH_ID,
        status: PerformanceStatus.SUBMITTED,
        submittedAt: new Date(Date.now() - 72 * HOUR_MS),
        adminOverrideGranted: true,
        metricValues: {},
      } as StudentMatchPerformanceEntity;
      performanceRepo.find!.mockResolvedValue([existingRecord]);

      await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false);

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ adminOverrideGranted: false }),
      );
    });

    it('a draft-status record has no time restriction regardless of age', async () => {
      performanceRepo.find!.mockResolvedValue([
        {
          id: 'perf-1',
          studentId: STUDENT_A,
          matchId: MATCH_ID,
          status: PerformanceStatus.DRAFT,
          submittedAt: null,
          adminOverrideGranted: false,
          metricValues: {},
        } as StudentMatchPerformanceEntity,
      ]);

      await expect(
        service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false),
      ).resolves.toBeDefined();
    });

    it('sets submittedAt only on the first draft→submitted transition, not on later edits', async () => {
      const originalSubmittedAt = new Date(Date.now() - 5 * HOUR_MS);
      performanceRepo.find!.mockResolvedValue([
        {
          id: 'perf-1',
          studentId: STUDENT_A,
          matchId: MATCH_ID,
          status: PerformanceStatus.SUBMITTED,
          submittedAt: originalSubmittedAt,
          adminOverrideGranted: false,
          metricValues: {},
        } as StudentMatchPerformanceEntity,
      ]);

      await service.bulkUpsertPerformance(
        SPORT_ID,
        MATCH_ID,
        makeDto({ status: PerformanceStatus.SUBMITTED }),
        COACH_ID,
        false,
      );

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ submittedAt: originalSubmittedAt }),
      );
    });
  });

  describe('bulkUpsertPerformance — personal-best computation end-to-end', () => {
    it('flags a personal best on Athletics Track when no prior records exist', async () => {
      qbMock.getMany.mockResolvedValue([]);

      await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false);

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ personalBests: { 'Finish time': true } }),
      );
    });

    it('does not flag a personal best when a prior record is faster', async () => {
      qbMock.getMany.mockResolvedValue([
        makePerformance({ metricValues: { 'Finish time': 11.0 } }),
      ]);

      await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, makeDto(), COACH_ID, false);

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ personalBests: { 'Finish time': false } }),
      );
    });

    it('never computes a personal best for a non-eligible sport (Cricket), regardless of metric flags', async () => {
      sportsService.resolveSportForMatchManagement.mockResolvedValue(makeSport({ sportTypeId: SPORT_TYPE_CRICKET.id, sportType: SPORT_TYPE_CRICKET }));
      sportMetricRepo.find!.mockResolvedValue(CRICKET_METRICS);
      const dto = makeDto({ entries: [{ studentId: STUDENT_A, metricValues: { 'Runs scored': 42 } }] });

      await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false);

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ personalBests: {} }),
      );
    });

    it("the explicitly-disclosed Swimming nuance: Distance is never flagged despite isDistanceBased, but Finish time is", async () => {
      sportsService.resolveSportForMatchManagement.mockResolvedValue(makeSport({ sportTypeId: SPORT_TYPE_SWIMMING.id, sportType: SPORT_TYPE_SWIMMING }));
      sportMetricRepo.find!.mockResolvedValue(SWIMMING_METRICS);
      qbMock.getMany.mockResolvedValue([]);
      const dto = makeDto({
        entries: [{ studentId: STUDENT_A, metricValues: { 'Finish time': 28.4, Distance: 50 } }],
      });

      await service.bulkUpsertPerformance(SPORT_ID, MATCH_ID, dto, COACH_ID, false);

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ personalBests: { 'Finish time': true } }),
      );
    });
  });

  describe('grantOverride', () => {
    it('sets adminOverrideGranted and audit fields', async () => {
      performanceRepo.findOne!.mockResolvedValue({
        id: 'perf-1',
        adminOverrideGranted: false,
      } as StudentMatchPerformanceEntity);

      await service.grantOverride('perf-1', 'admin-uuid');

      expect(performanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          adminOverrideGranted: true,
          adminOverrideGrantedByStaffId: 'admin-uuid',
        }),
      );
    });

    it('throws NotFoundException for an unknown performance record', async () => {
      performanceRepo.findOne!.mockResolvedValue(null);

      await expect(service.grantOverride('missing', 'admin-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEntryGrid', () => {
    it('merges roster, metrics, and existing performance rows, computing canEdit per row', async () => {
      performanceRepo.find!.mockResolvedValue([
        makePerformance({
          id: 'perf-1',
          studentId: STUDENT_A,
          status: PerformanceStatus.SUBMITTED,
          submittedAt: new Date(Date.now() - 72 * HOUR_MS),
          adminOverrideGranted: false,
          metricValues: { 'Finish time': 12.1 },
          personalBests: { 'Finish time': true },
        }),
      ]);

      const result = await service.findEntryGrid(SPORT_ID, MATCH_ID, COACH_ID, false);

      expect(result.roster).toHaveLength(2);
      const rowA = result.roster.find((r) => r.studentId === STUDENT_A)!;
      const rowB = result.roster.find((r) => r.studentId === STUDENT_B)!;
      expect(rowA.canEdit).toBe(false); // submitted 72h ago, no override
      expect(rowA.personalBests).toEqual({ 'Finish time': true });
      expect(rowB.canEdit).toBe(true); // no record yet
      expect(rowB.performanceId).toBeNull();
    });

    it('throws NotFoundException when the match does not belong to this sport', async () => {
      matchRepo.findOne!.mockResolvedValue(null);

      await expect(service.findEntryGrid(SPORT_ID, MATCH_ID, COACH_ID, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cross-service authorization — the explicitly-requested integration test (FR-P3-AV-03)', () => {
    // Wires a REAL SportsService (mocked repos only, not a mocked service) alongside
    // PerformanceService, so findEntryGrid's call into the real resolveSportForViewing/
    // assertAuthorized genuinely executes and rejects — the other describe blocks in this file
    // mock SportsService entirely away, which never exercises this rejection path at all.
    let realService: PerformanceService;
    let realSportsService: SportsService;
    let realSportRepo: MockRepo<SportEntity>;
    let realEnrollmentRepo: MockRepo<SportEnrollmentEntity>;

    beforeEach(async () => {
      realSportRepo = repoMock<SportEntity>();
      realEnrollmentRepo = repoMock<SportEnrollmentEntity>();
      const realStaffRepo = repoMock<StaffEntity>();
      const realStudentRepo = repoMock<StudentEntity>();
      const realMatchRepo = repoMock<MatchEntity>();
      const realTrainingSessionRepo = repoMock<TrainingSessionEntity>();
      const realPerformanceRepo = repoMock<StudentMatchPerformanceEntity>();
      const realSportMetricRepo = repoMock<SportMetricEntity>();
      const realSportTypeRepo = repoMock<SportTypeEntity>();

      realSportRepo.findOne!.mockResolvedValue(makeSport());
      realMatchRepo.findOne!.mockResolvedValue(makeMatch());
      realSportMetricRepo.find!.mockResolvedValue(ATHLETICS_TRACK_METRICS);
      realPerformanceRepo.find!.mockResolvedValue([]);
      realEnrollmentRepo.find!.mockResolvedValue([
        {
          studentId: STUDENT_A,
          enrolledAt: new Date(),
          student: { firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
        },
      ]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PerformanceService,
          SportsService,
          { provide: getRepositoryToken(StudentMatchPerformanceEntity), useValue: realPerformanceRepo },
          { provide: getRepositoryToken(MatchEntity), useValue: realMatchRepo },
          { provide: getRepositoryToken(SportMetricEntity), useValue: realSportMetricRepo },
          { provide: getRepositoryToken(SportEntity), useValue: realSportRepo },
          { provide: getRepositoryToken(SportTypeEntity), useValue: realSportTypeRepo },
          { provide: getRepositoryToken(SportEnrollmentEntity), useValue: realEnrollmentRepo },
          { provide: getRepositoryToken(StaffEntity), useValue: realStaffRepo },
          { provide: getRepositoryToken(StudentEntity), useValue: realStudentRepo },
          { provide: getRepositoryToken(TrainingSessionEntity), useValue: realTrainingSessionRepo },
          { provide: DataSource, useValue: { transaction: jest.fn() } },
        ],
      }).compile();

      realService = module.get<PerformanceService>(PerformanceService);
      realSportsService = module.get<SportsService>(SportsService);
    });

    it('propagates a real ForbiddenException for a non-coach, non-privileged caller', async () => {
      await expect(
        realService.findEntryGrid(SPORT_ID, MATCH_ID, 'some-other-staff-id', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('succeeds for the sport\'s real assigned coach', async () => {
      await expect(
        realService.findEntryGrid(SPORT_ID, MATCH_ID, COACH_ID, false),
      ).resolves.toBeDefined();
    });

    it('succeeds for a privileged caller regardless of coach assignment', async () => {
      await expect(
        realService.findEntryGrid(SPORT_ID, MATCH_ID, 'principal-staff-id', true),
      ).resolves.toBeDefined();
    });

    it('sanity check: the real SportsService instance is actually wired in (not accidentally still mocked)', () => {
      expect(realSportsService).toBeInstanceOf(SportsService);
    });
  });
});
