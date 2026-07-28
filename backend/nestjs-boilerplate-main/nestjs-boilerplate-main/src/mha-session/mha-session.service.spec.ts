import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { MhaSessionService } from './mha-session.service';
import { MhaSessionEntity, MhaSessionStatus } from './entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { DisorderRegistryEntity, DisorderSection, RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultEntity, DomainResultLevel } from '../domain-result/entities/domain-result.entity';
import { MhaConsentService } from '../mha-consent/mha-consent.service';
import { AuditService } from '../audit/audit.service';
import { RiskAggregationService } from '../risk-summary/risk-aggregation.service';
import { RecommendedActionService } from '../session-action/recommended-action.service';
import { SessionActionStatus } from '../session-action/entities/session-action.entity';
import { TopFindingsService } from '../top-findings/top-findings.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  count: jest.fn().mockResolvedValue(0),
  query: jest.fn().mockResolvedValue([[]]),
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SCREENING_DATE = '2026-07-23';

// Mirrors the service's own literal formula so boundary DOBs can be constructed exactly.
function computeAgeForTest(dobIso: string, screeningIso: string): number {
  const dobMs = new Date(`${dobIso}T00:00:00.000Z`).getTime();
  const screeningMs = new Date(`${screeningIso}T00:00:00.000Z`).getTime();
  return Math.floor((screeningMs - dobMs) / MS_PER_DAY / 365.25);
}

function daysAgoDate(baseIso: string, daysAgo: number): string {
  const base = new Date(`${baseIso}T00:00:00.000Z`);
  return new Date(base.getTime() - daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
}

function dobForExactAge(screeningIso: string, targetAge: number): string {
  let daysAgo = Math.round(targetAge * 365.25);
  while (computeAgeForTest(daysAgoDate(screeningIso, daysAgo), screeningIso) !== targetAge) {
    daysAgo += computeAgeForTest(daysAgoDate(screeningIso, daysAgo), screeningIso) < targetAge ? 1 : -1;
  }
  return daysAgoDate(screeningIso, daysAgo);
}

const STUDENT_ID = 'student-uuid';
const STAFF_ID = 'counselor-staff-uuid';

const DEPRESSION: DisorderRegistryEntity = {
  id: 'domain-depression',
  code: 'MHA-DOM-06',
  name: 'Depression',
  section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
  riskCategory: RiskCategory.EMOTIONAL_RISK,
  ageMin: 12,
  ageMax: 19,
  symptoms: [],
  tests: [],
  safetyFlag: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MhaSessionService', () => {
  let service: MhaSessionService;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let registryRepo: MockRepo<DisorderRegistryEntity>;
  let domainResultRepo: MockRepo<DomainResultEntity>;
  let mhaConsentService: { assertConsentExists: jest.Mock };
  let auditService: { log: jest.Mock };
  let riskAggregationService: { aggregate: jest.Mock; getPersistedSummary: jest.Mock };
  let recommendedActionService: { generate: jest.Mock; getPersistedActions: jest.Mock };
  let topFindingsService: { compute: jest.Mock };
  let queryBuilderAndWhereCalls: Array<[string, unknown]>;
  let registryGetManyResult: DisorderRegistryEntity[];
  let sessionLastCaseNumber: { caseNumber: string } | undefined;
  let domainResultSaveCalls: DomainResultEntity[][];

  const buildRegistryQb = () => {
    queryBuilderAndWhereCalls = [];
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn(function (this: unknown, cond: string, params: unknown) {
        queryBuilderAndWhereCalls.push([cond, params]);
        return this;
      }),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => Promise.resolve(registryGetManyResult)),
    };
  };

  const buildSessionQb = () => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(() => Promise.resolve(sessionLastCaseNumber)),
  });

  beforeEach(async () => {
    sessionRepo = repoMock<MhaSessionEntity>();
    studentRepo = repoMock<StudentEntity>();
    registryRepo = repoMock<DisorderRegistryEntity>();
    domainResultRepo = repoMock<DomainResultEntity>();

    studentRepo.findOne!.mockResolvedValue({
      id: STUDENT_ID,
      firstName: 'Kasun',
      lastName: 'Bandara',
      dateOfBirth: dobForExactAge(SCREENING_DATE, 15),
      grade: { level: 10 },
      classSection: { name: 'A' },
    });

    registryGetManyResult = [DEPRESSION];
    registryRepo.createQueryBuilder = jest.fn(() => buildRegistryQb() as never);

    sessionLastCaseNumber = undefined;
    sessionRepo.createQueryBuilder = jest.fn(() => buildSessionQb() as never);

    mhaConsentService = { assertConsentExists: jest.fn().mockResolvedValue(undefined) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    riskAggregationService = {
      aggregate: jest.fn().mockResolvedValue({ riskSummaries: [] }),
      getPersistedSummary: jest.fn().mockResolvedValue([]),
    };
    recommendedActionService = {
      generate: jest.fn().mockResolvedValue([]),
      getPersistedActions: jest.fn().mockResolvedValue([]),
    };
    topFindingsService = { compute: jest.fn().mockReturnValue([]) };

    domainResultSaveCalls = [];
    const dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => {
        const manager = {
          create: (_entity: unknown, data: unknown) => data,
          save: (entity: unknown, data: unknown) => {
            if (entity === DomainResultEntity) {
              domainResultSaveCalls.push(data as DomainResultEntity[]);
              return Promise.resolve(data);
            }
            return Promise.resolve({ id: 'session-id', ...(data as object) });
          },
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MhaSessionService,
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(DisorderRegistryEntity), useValue: registryRepo },
        { provide: getRepositoryToken(DomainResultEntity), useValue: domainResultRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: MhaConsentService, useValue: mhaConsentService },
        { provide: AuditService, useValue: auditService },
        { provide: RiskAggregationService, useValue: riskAggregationService },
        { provide: RecommendedActionService, useValue: recommendedActionService },
        { provide: TopFindingsService, useValue: topFindingsService },
      ],
    }).compile();

    service = module.get<MhaSessionService>(MhaSessionService);
  });

  describe('previewDomains — age computation (explicitly-requested test a)', () => {
    it('computes age exactly at ageMin as included (passes ageMin=12 through the query)', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID,
        dateOfBirth: dobForExactAge(SCREENING_DATE, 12),
      });
      const result = await service.previewDomains(STUDENT_ID, SCREENING_DATE);
      expect(result.studentAge).toBe(12);
      expect(queryBuilderAndWhereCalls).toContainEqual(['d.ageMin <= :age', { age: 12 }]);
    });

    it('computes age exactly at ageMax correctly', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID,
        dateOfBirth: dobForExactAge(SCREENING_DATE, 19),
      });
      const result = await service.previewDomains(STUDENT_ID, SCREENING_DATE);
      expect(result.studentAge).toBe(19);
    });

    it('computes age one below ageMin correctly (age = ageMin - 1)', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID,
        dateOfBirth: dobForExactAge(SCREENING_DATE, 11),
      });
      const result = await service.previewDomains(STUDENT_ID, SCREENING_DATE);
      expect(result.studentAge).toBe(11);
      expect(queryBuilderAndWhereCalls).toContainEqual(['d.ageMin <= :age', { age: 11 }]);
    });

    it('defaults screeningDate to today when omitted', async () => {
      const result = await service.previewDomains(STUDENT_ID);
      expect(typeof result.studentAge).toBe('number');
    });

    it('throws NotFoundException for an unknown student', async () => {
      studentRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.previewDomains(STUDENT_ID, SCREENING_DATE)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSession', () => {
    const dto = { studentId: STUDENT_ID, screeningDate: SCREENING_DATE };

    it('creates a draft session with the consent gate checked first', async () => {
      const result = await service.createSession(dto, STAFF_ID);
      expect(mhaConsentService.assertConsentExists).toHaveBeenCalledWith(STUDENT_ID);
      expect(result.session.status).toBe(MhaSessionStatus.DRAFT);
      expect(result.session.caseNumber).toBe('SC-20260723-001');
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'create_session',
        targetType: 'mha_session',
        targetId: 'session-id',
      });
    });

    it('propagates the real 409 from MhaConsentService when no consent exists (end-to-end wiring, not a mock of the gate)', async () => {
      mhaConsentService.assertConsentExists.mockRejectedValue(
        new ConflictException('No guardian consent has been recorded for this student.'),
      );
      await expect(service.createSession(dto, STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('increments the sequence when a case number already exists that day', async () => {
      sessionLastCaseNumber = { caseNumber: 'SC-20260723-004' };
      const result = await service.createSession(dto, STAFF_ID);
      expect(result.session.caseNumber).toBe('SC-20260723-005');
    });
  });

  describe('createSession — pre-creates DomainResult rows (MHA-120, AI-prompt test a)', () => {
    const dto = { studentId: STUDENT_ID, screeningDate: SCREENING_DATE };

    it("pre-creates one DomainResult row per filtered domain, each stored as 'not_assessed' — not 'none'", async () => {
      const result = await service.createSession(dto, STAFF_ID);

      expect(domainResultSaveCalls).toHaveLength(1);
      expect(domainResultSaveCalls[0]).toEqual([
        {
          sessionId: result.session.id,
          domainId: DEPRESSION.id,
          level: DomainResultLevel.NOT_ASSESSED,
        },
      ]);
    });

    it('does not call manager.save(DomainResultEntity, ...) when the filtered domain list is empty', async () => {
      registryGetManyResult = [];
      await service.createSession(dto, STAFF_ID);
      expect(domainResultSaveCalls).toHaveLength(0);
    });
  });

  describe('createSession — case-number collision retry (explicitly-requested test b)', () => {
    it('regenerates a different case number and succeeds after a concurrent-collision unique-violation', async () => {
      const dto = { studentId: STUDENT_ID, screeningDate: SCREENING_DATE };

      // First generateCaseNumber() call sees no existing row -> generates "001".
      // The transaction attempt then fails with a real Postgres unique-violation code,
      // simulating another request winning the race in between.
      let transactionAttempt = 0;
      const dataSourceWithCollision = {
        transaction: jest.fn((cb: (m: unknown) => unknown) => {
          transactionAttempt += 1;
          if (transactionAttempt === 1) {
            const err = new Error('duplicate key value violates unique constraint "UQ_mha_session_case_number"') as Error & { code: string };
            err.code = '23505';
            return Promise.reject(err);
          }
          const manager = {
            create: (_entity: unknown, data: unknown) => data,
            save: (_entity: unknown, data: unknown) => Promise.resolve({ id: 'session-id-2', ...(data as object) }),
          };
          return Promise.resolve(cb(manager));
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MhaSessionService,
          { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
          { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
          { provide: getRepositoryToken(DisorderRegistryEntity), useValue: registryRepo },
          { provide: getRepositoryToken(DomainResultEntity), useValue: domainResultRepo },
          { provide: DataSource, useValue: dataSourceWithCollision },
          { provide: MhaConsentService, useValue: mhaConsentService },
          { provide: AuditService, useValue: auditService },
          { provide: RiskAggregationService, useValue: riskAggregationService },
          { provide: RecommendedActionService, useValue: recommendedActionService },
          { provide: TopFindingsService, useValue: topFindingsService },
        ],
      }).compile();
      const collisionService = module.get<MhaSessionService>(MhaSessionService);

      // On retry, the case-number query now sees the row the "concurrent" request created.
      sessionRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValueOnce(buildSessionQb() as never) // 1st generateCaseNumber(): no existing row -> "001"
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ caseNumber: 'SC-20260723-001' }),
        } as never); // 2nd call, after the collision, sees "001" already taken -> "002"

      const result = await collisionService.createSession(dto, STAFF_ID);

      expect(transactionAttempt).toBe(2);
      expect(result.session.caseNumber).toBe('SC-20260723-002');
    });

    it('rethrows immediately on a non-collision error without retrying', async () => {
      const dto = { studentId: STUDENT_ID, screeningDate: SCREENING_DATE };
      const otherError = new Error('connection lost');
      const dataSourceWithOtherError = {
        transaction: jest.fn(() => Promise.reject(otherError)),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MhaSessionService,
          { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
          { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
          { provide: getRepositoryToken(DisorderRegistryEntity), useValue: registryRepo },
          { provide: getRepositoryToken(DomainResultEntity), useValue: domainResultRepo },
          { provide: DataSource, useValue: dataSourceWithOtherError },
          { provide: MhaConsentService, useValue: mhaConsentService },
          { provide: AuditService, useValue: auditService },
          { provide: RiskAggregationService, useValue: riskAggregationService },
          { provide: RecommendedActionService, useValue: recommendedActionService },
          { provide: TopFindingsService, useValue: topFindingsService },
        ],
      }).compile();
      const errorService = module.get<MhaSessionService>(MhaSessionService);

      await expect(errorService.createSession(dto, STAFF_ID)).rejects.toThrow('connection lost');
      expect(dataSourceWithOtherError.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSessionById', () => {
    it('returns the session when found', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: 'session-1', caseNumber: 'SC-20260723-001' });
      const result = await service.getSessionById('session-1');
      expect(result.id).toBe('session-1');
    });

    it('throws NotFoundException when missing', async () => {
      sessionRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.getSessionById('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeSession (MHA-123 AC #4, MHA-124 AC #2/#4/#5)', () => {
    const SESSION_ID = 'session-1';

    function buildDomainRow(overrides: { level?: DomainResultLevel; safetyFlagRaised?: boolean; domainName?: string; riskCategory?: RiskCategory; section?: DisorderSection } = {}) {
      return {
        level: overrides.level ?? DomainResultLevel.LOW,
        safetyFlagRaised: overrides.safetyFlagRaised ?? false,
        domain: {
          name: overrides.domainName ?? 'ADHD',
          riskCategory: overrides.riskCategory ?? RiskCategory.BEHAVIORAL_RISK,
          section: overrides.section ?? DisorderSection.EDUCATIONAL_DISORDERS,
        },
      };
    }

    it('completes a draft session with at least one assessed domain, sets completedAt, returns the summary DTO', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT, studentId: STUDENT_ID, caseNumber: 'SC-20260723-001', screeningDate: SCREENING_DATE });
      domainResultRepo.find!.mockResolvedValue([buildDomainRow()]);
      riskAggregationService.aggregate.mockResolvedValue({
        riskSummaries: [{ riskCategory: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.LOW }],
      });
      const findings = [
        { domainName: 'Depression', section: DisorderSection.EMOTIONAL_MENTAL_HEALTH, riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.SEVERE },
      ];
      topFindingsService.compute.mockReturnValue(findings);
      recommendedActionService.generate.mockResolvedValue([
        { id: 'action-1', actionText: 'School Counselor Review', sortOrder: 0, status: SessionActionStatus.OPEN },
      ]);

      const result = await service.completeSession(SESSION_ID, STAFF_ID);

      expect(result.status).toBe(MhaSessionStatus.COMPLETE);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.riskCategories).toEqual([{ category: RiskCategory.BEHAVIORAL_RISK, level: DomainResultLevel.LOW }]);
      expect(result.topFindings).toEqual(findings);
      expect(result.recommendedActions).toEqual([
        { id: 'action-1', actionText: 'School Counselor Review', status: SessionActionStatus.OPEN },
      ]);
      expect(result.studentName).toBe('Kasun Bandara');
      expect(result.grade).toBe('10A');
      // MHA-132 — topFindingsSnapshot rides along with the one status/completedAt save, not a second write.
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
      expect(sessionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ topFindingsSnapshot: findings }));
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'complete_session',
        targetType: 'mha_session',
        targetId: SESSION_ID,
      });
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'generate_summary',
        targetType: 'mha_session',
        targetId: SESSION_ID,
      });
    });

    it('AI-prompt test (b): calls RiskAggregationService and RecommendedActionService exactly once, with the pre-fetched domain rows (not re-queried)', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT, studentId: STUDENT_ID, caseNumber: 'SC-20260723-001', screeningDate: SCREENING_DATE });
      const rows = [buildDomainRow({ level: DomainResultLevel.HIGH, domainName: 'Anxiety', riskCategory: RiskCategory.EMOTIONAL_RISK, section: DisorderSection.EMOTIONAL_MENTAL_HEALTH })];
      domainResultRepo.find!.mockResolvedValue(rows);

      await service.completeSession(SESSION_ID, STAFF_ID);

      expect(riskAggregationService.aggregate).toHaveBeenCalledTimes(1);
      expect(riskAggregationService.aggregate).toHaveBeenCalledWith(SESSION_ID, [
        { level: DomainResultLevel.HIGH, domainName: 'Anxiety', riskCategory: RiskCategory.EMOTIONAL_RISK, safetyFlagRaised: false },
      ]);
      expect(recommendedActionService.generate).toHaveBeenCalledTimes(1);
      // MHA-132 — TopFindingsService also runs exactly once, fed from the same pre-fetched rows.
      expect(topFindingsService.compute).toHaveBeenCalledTimes(1);
      expect(topFindingsService.compute).toHaveBeenCalledWith([
        { level: DomainResultLevel.HIGH, domainName: 'Anxiety', section: DisorderSection.EMOTIONAL_MENTAL_HEALTH, riskCategory: RiskCategory.EMOTIONAL_RISK },
      ]);
      // domainResultRepo.find is only ever called once per completeSession() call (no second/re-query).
      expect(domainResultRepo.find).toHaveBeenCalledTimes(1);
    });

    it('passes hasSafetyFlag=true to RecommendedActionService when any domain has safetyFlagRaised', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT, studentId: STUDENT_ID, caseNumber: 'SC-20260723-001', screeningDate: SCREENING_DATE });
      domainResultRepo.find!.mockResolvedValue([
        buildDomainRow({ domainName: 'Depression', riskCategory: RiskCategory.EMOTIONAL_RISK, safetyFlagRaised: true }),
      ]);

      await service.completeSession(SESSION_ID, STAFF_ID);

      expect(recommendedActionService.generate).toHaveBeenCalledWith(SESSION_ID, expect.anything(), true);
    });

    it('throws NotFoundException for a missing session', async () => {
      sessionRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.completeSession(SESSION_ID, STAFF_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the session is already complete', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.COMPLETE });
      await expect(service.completeSession(SESSION_ID, STAFF_ID)).rejects.toThrow(ConflictException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the session is already abandoned', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.ABANDONED });
      await expect(service.completeSession(SESSION_ID, STAFF_ID)).rejects.toThrow(ConflictException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when zero domains are assessed', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT });
      domainResultRepo.find!.mockResolvedValue([buildDomainRow({ level: DomainResultLevel.NOT_ASSESSED })]);
      await expect(service.completeSession(SESSION_ID, STAFF_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(sessionRepo.save).not.toHaveBeenCalled();
      expect(riskAggregationService.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('getSessionSummary (MHA-124, FR-MHA-26 "retrievable record")', () => {
    const SESSION_ID = 'session-1';

    it('throws NotFoundException for a missing session', async () => {
      sessionRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.getSessionSummary(SESSION_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no risk_summary rows exist (draft or abandoned session)', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT, studentId: STUDENT_ID });
      riskAggregationService.getPersistedSummary.mockResolvedValue([]);
      await expect(service.getSessionSummary(SESSION_ID)).rejects.toThrow(NotFoundException);
    });

    it('reassembles the summary DTO from persisted rows for a completed session, reading topFindings straight off the snapshot (no re-query)', async () => {
      const snapshot = [
        { domainName: 'Anxiety', section: DisorderSection.EMOTIONAL_MENTAL_HEALTH, riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.HIGH },
      ];
      sessionRepo.findOne!.mockResolvedValue({
        id: SESSION_ID, status: MhaSessionStatus.COMPLETE, studentId: STUDENT_ID,
        caseNumber: 'SC-20260723-001', screeningDate: SCREENING_DATE, completedAt: new Date(),
        topFindingsSnapshot: snapshot,
      });
      riskAggregationService.getPersistedSummary.mockResolvedValue([
        { riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.HIGH },
      ]);
      recommendedActionService.getPersistedActions.mockResolvedValue([
        { id: 'action-1', actionText: 'School Counselor Review', status: SessionActionStatus.OPEN },
      ]);

      const result = await service.getSessionSummary(SESSION_ID);

      expect(result.riskCategories).toEqual([{ category: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.HIGH }]);
      expect(result.recommendedActions).toEqual([
        { id: 'action-1', actionText: 'School Counselor Review', status: SessionActionStatus.OPEN },
      ]);
      expect(result.topFindings).toEqual(snapshot);
      // MHA-132 — no longer re-queries DomainResult to recompute Top Findings.
      expect(domainResultRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('listSessions (MHA-123, AC #2)', () => {
    it('returns all sessions enriched with student name when no status filter is given', async () => {
      sessionRepo.find!.mockResolvedValue([
        { id: 's1', caseNumber: 'SC-1', studentId: STUDENT_ID, counselorStaffId: STAFF_ID, screeningDate: SCREENING_DATE, status: MhaSessionStatus.DRAFT, createdAt: new Date(), updatedAt: new Date(), topFindingsSnapshot: [] },
      ]);
      studentRepo.find!.mockResolvedValue([{ id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara' }]);

      const result = await service.listSessions();

      expect(sessionRepo.find).toHaveBeenCalledWith({ where: {}, order: { updatedAt: 'DESC' } });
      expect(result[0].studentName).toBe('Kasun Bandara');
    });

    it('passes topFindings through from the persisted snapshot, without a join (MHA-132, AC #62)', async () => {
      const snapshot = [
        { domainName: 'Depression', section: DisorderSection.EMOTIONAL_MENTAL_HEALTH, riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.SEVERE },
      ];
      sessionRepo.find!.mockResolvedValue([
        { id: 's1', caseNumber: 'SC-1', studentId: STUDENT_ID, counselorStaffId: STAFF_ID, screeningDate: SCREENING_DATE, status: MhaSessionStatus.COMPLETE, createdAt: new Date(), updatedAt: new Date(), topFindingsSnapshot: snapshot },
      ]);
      studentRepo.find!.mockResolvedValue([{ id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara' }]);

      const result = await service.listSessions();

      expect(result[0].topFindings).toEqual(snapshot);
    });

    it('passes a status filter through to the repo query', async () => {
      sessionRepo.find!.mockResolvedValue([]);
      await service.listSessions(MhaSessionStatus.DRAFT);
      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { status: MhaSessionStatus.DRAFT },
        order: { updatedAt: 'DESC' },
      });
    });

    it('passes a studentId filter through to the repo query (MHA-124, AC #5)', async () => {
      sessionRepo.find!.mockResolvedValue([]);
      await service.listSessions(undefined, STUDENT_ID);
      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { studentId: STUDENT_ID },
        order: { updatedAt: 'DESC' },
      });
    });

    it('combines status and studentId filters together', async () => {
      sessionRepo.find!.mockResolvedValue([]);
      await service.listSessions(MhaSessionStatus.COMPLETE, STUDENT_ID);
      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { status: MhaSessionStatus.COMPLETE, studentId: STUDENT_ID },
        order: { updatedAt: 'DESC' },
      });
    });

    it('falls back to "Unknown Student" when the linked student cannot be found, without throwing', async () => {
      sessionRepo.find!.mockResolvedValue([
        { id: 's1', caseNumber: 'SC-1', studentId: 'missing-student', counselorStaffId: STAFF_ID, screeningDate: SCREENING_DATE, status: MhaSessionStatus.DRAFT, createdAt: new Date(), updatedAt: new Date() },
      ]);
      studentRepo.find!.mockResolvedValue([]);

      const result = await service.listSessions();
      expect(result[0].studentName).toBe('Unknown Student');
    });

    it('returns an empty array without querying students when there are no sessions', async () => {
      sessionRepo.find!.mockResolvedValue([]);
      const result = await service.listSessions();
      expect(result).toEqual([]);
      expect(studentRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('abandonStaleDrafts (MHA-123, AC #3, AI-prompt test a)', () => {
    it('queries for draft sessions past the 48-hour true-last-activity threshold and audit-logs each abandoned id', async () => {
      sessionRepo.query!.mockResolvedValue([[{ id: 'stale-session-1' }, { id: 'stale-session-2' }]]);

      const count = await service.abandonStaleDrafts();

      expect(count).toBe(2);
      const sql = (sessionRepo.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain("'draft'");
      expect(sql).toContain('48 hours');
      expect(sql).toContain('domain_result');
      expect(sql).toContain('GREATEST');

      expect(auditService.log).toHaveBeenCalledWith({
        actorId: '00000000-0000-0000-0000-000000000000',
        action: 'abandon_session',
        targetType: 'mha_session',
        targetId: 'stale-session-1',
      });
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: '00000000-0000-0000-0000-000000000000',
        action: 'abandon_session',
        targetType: 'mha_session',
        targetId: 'stale-session-2',
      });
      expect(auditService.log).toHaveBeenCalledTimes(2);
    });

    it('logs nothing and returns 0 when no drafts are past the threshold', async () => {
      sessionRepo.query!.mockResolvedValue([[]]);
      const count = await service.abandonStaleDrafts();
      expect(count).toBe(0);
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });
});
