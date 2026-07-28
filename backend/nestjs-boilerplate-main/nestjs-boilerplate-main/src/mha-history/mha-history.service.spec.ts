import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { MhaHistoryService } from './mha-history.service';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { SessionActionEntity, SessionActionStatus } from '../session-action/entities/session-action.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
});

const STUDENT_ID = 'student-1';
const STAFF_ID = 'staff-1';

function buildStudent(): StudentEntity {
  return { id: STUDENT_ID, firstName: 'John', lastName: 'Perera' } as StudentEntity;
}

function buildSession(overrides: Partial<MhaSessionEntity> = {}): MhaSessionEntity {
  return {
    id: 'session-1',
    caseNumber: 'SC-20260701-001',
    studentId: STUDENT_ID,
    counselorStaffId: STAFF_ID,
    screeningDate: '2026-07-01',
    status: MhaSessionStatus.COMPLETE,
    completedAt: new Date('2026-07-01T00:00:00.000Z'),
    topFindingsSnapshot: [],
    ...overrides,
  } as MhaSessionEntity;
}

function buildRiskSummary(sessionId: string, category: RiskCategory, level: DomainResultLevel): RiskSummaryEntity {
  return { id: `rs-${sessionId}-${category}`, sessionId, riskCategory: category, level } as RiskSummaryEntity;
}

function buildAction(sessionId: string): SessionActionEntity {
  return {
    id: `action-${sessionId}`,
    sessionId,
    actionText: 'School Counselor Review',
    sortOrder: 0,
    status: SessionActionStatus.OPEN,
  } as SessionActionEntity;
}

function buildStaff(): StaffEntity {
  return { id: STAFF_ID, firstName: 'Dilini', lastName: 'Jayawardena' } as StaffEntity;
}

describe('MhaHistoryService', () => {
  let service: MhaHistoryService;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let riskSummaryRepo: MockRepo<RiskSummaryEntity>;
  let sessionActionRepo: MockRepo<SessionActionEntity>;
  let staffRepo: MockRepo<StaffEntity>;

  beforeEach(async () => {
    sessionRepo = repoMock<MhaSessionEntity>();
    studentRepo = repoMock<StudentEntity>();
    riskSummaryRepo = repoMock<RiskSummaryEntity>();
    sessionActionRepo = repoMock<SessionActionEntity>();
    staffRepo = repoMock<StaffEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MhaHistoryService,
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(RiskSummaryEntity), useValue: riskSummaryRepo },
        { provide: getRepositoryToken(SessionActionEntity), useValue: sessionActionRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
      ],
    }).compile();

    service = module.get(MhaHistoryService);
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildStudent());
  });

  it('throws 404 when the student does not exist', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.getHistory(STUDENT_ID)).rejects.toThrow(NotFoundException);
  });

  it('requests sessions ordered oldest to newest (completedAt ASC)', async () => {
    (sessionRepo.find as jest.Mock).mockResolvedValue([]);
    await service.getHistory(STUDENT_ID);
    expect(sessionRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { completedAt: 'ASC' } }),
    );
  });

  it('returns sessions: [] and trends: null, without querying risk summaries/actions, when the student has zero completed sessions', async () => {
    (sessionRepo.find as jest.Mock).mockResolvedValue([]);
    const result = await service.getHistory(STUDENT_ID);
    expect(result).toEqual({ studentId: STUDENT_ID, studentName: 'John Perera', sessions: [], trends: null });
    expect(riskSummaryRepo.find).not.toHaveBeenCalled();
    expect(sessionActionRepo.find).not.toHaveBeenCalled();
  });

  // AI-prompt test (b) — trend omitted (null), not 'stable', when only one session exists.
  it('returns trends: null when exactly one completed session exists', async () => {
    (sessionRepo.find as jest.Mock).mockResolvedValue([buildSession()]);
    (riskSummaryRepo.find as jest.Mock).mockResolvedValue([
      buildRiskSummary('session-1', RiskCategory.ACADEMIC_RISK, DomainResultLevel.MODERATE),
    ]);
    (staffRepo.find as jest.Mock).mockResolvedValue([buildStaff()]);

    const result = await service.getHistory(STUDENT_ID);

    expect(result.sessions).toHaveLength(1);
    expect(result.trends).toBeNull();
  });

  it('fetches risk summaries and actions via exactly one bulk In() query each, not per session', async () => {
    const sessions = [
      buildSession({ id: 's1', completedAt: new Date('2026-07-01T00:00:00.000Z') }),
      buildSession({ id: 's2', completedAt: new Date('2026-07-10T00:00:00.000Z') }),
      buildSession({ id: 's3', completedAt: new Date('2026-07-20T00:00:00.000Z') }),
    ];
    (sessionRepo.find as jest.Mock).mockResolvedValue(sessions);
    (riskSummaryRepo.find as jest.Mock).mockResolvedValue([]);
    (sessionActionRepo.find as jest.Mock).mockResolvedValue([]);
    (staffRepo.find as jest.Mock).mockResolvedValue([buildStaff()]);

    await service.getHistory(STUDENT_ID);

    expect(riskSummaryRepo.find).toHaveBeenCalledTimes(1);
    expect(sessionActionRepo.find).toHaveBeenCalledTimes(1);
  });

  it('batch-joins counselor names and groups risk summaries/actions per session correctly', async () => {
    const sessions = [
      buildSession({ id: 's1', completedAt: new Date('2026-07-01T00:00:00.000Z'), caseNumber: 'SC-1' }),
      buildSession({ id: 's2', completedAt: new Date('2026-07-10T00:00:00.000Z'), caseNumber: 'SC-2' }),
    ];
    (sessionRepo.find as jest.Mock).mockResolvedValue(sessions);
    (riskSummaryRepo.find as jest.Mock).mockResolvedValue([
      buildRiskSummary('s1', RiskCategory.ACADEMIC_RISK, DomainResultLevel.LOW),
      buildRiskSummary('s2', RiskCategory.ACADEMIC_RISK, DomainResultLevel.HIGH),
    ]);
    (sessionActionRepo.find as jest.Mock).mockResolvedValue([buildAction('s2')]);
    (staffRepo.find as jest.Mock).mockResolvedValue([buildStaff()]);

    const result = await service.getHistory(STUDENT_ID);

    expect(result.sessions[0].counselorName).toBe('Dilini Jayawardena');
    expect(result.sessions[0].riskCategories).toEqual([{ category: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.LOW }]);
    expect(result.sessions[0].recommendedActions).toEqual([]);
    expect(result.sessions[1].riskCategories).toEqual([{ category: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.HIGH }]);
    expect(result.sessions[1].recommendedActions).toHaveLength(1);
  });

  // AI-prompt test (a) — trend computation for all three outcomes across ordinal pairs.
  describe('trend computation (comparing the two most recent sessions)', () => {
    const ALL_LEVELS = [
      DomainResultLevel.NOT_ASSESSED,
      DomainResultLevel.NONE,
      DomainResultLevel.LOW,
      DomainResultLevel.MODERATE,
      DomainResultLevel.HIGH,
      DomainResultLevel.SEVERE,
    ];

    async function trendFor(previousLevel: DomainResultLevel, latestLevel: DomainResultLevel) {
      (sessionRepo.find as jest.Mock).mockResolvedValue([
        buildSession({ id: 's1', completedAt: new Date('2026-07-01T00:00:00.000Z') }),
        buildSession({ id: 's2', completedAt: new Date('2026-07-10T00:00:00.000Z') }),
      ]);
      (riskSummaryRepo.find as jest.Mock).mockResolvedValue([
        buildRiskSummary('s1', RiskCategory.ACADEMIC_RISK, previousLevel),
        buildRiskSummary('s2', RiskCategory.ACADEMIC_RISK, latestLevel),
      ]);
      (staffRepo.find as jest.Mock).mockResolvedValue([buildStaff()]);

      const result = await service.getHistory(STUDENT_ID);
      return result.trends?.find((t) => t.category === RiskCategory.ACADEMIC_RISK)?.trend;
    }

    it.each(ALL_LEVELS.map((level): [DomainResultLevel] => [level]))('%s -> same level is stable', async (level) => {
      expect(await trendFor(level, level)).toBe('stable');
    });

    it.each(
      ALL_LEVELS.slice(0, -1).map((level, i): [DomainResultLevel, DomainResultLevel] => [level, ALL_LEVELS[i + 1]]),
    )('%s -> %s is worse (adjacent forward pair)', async (prev, latest) => {
      expect(await trendFor(prev, latest)).toBe('worse');
    });

    it.each(
      ALL_LEVELS.slice(0, -1).map((level, i): [DomainResultLevel, DomainResultLevel] => [ALL_LEVELS[i + 1], level]),
    )('%s -> %s is better (adjacent reverse pair)', async (prev, latest) => {
      expect(await trendFor(prev, latest)).toBe('better');
    });

    it('not_assessed -> severe is worse (non-adjacent jump)', async () => {
      expect(await trendFor(DomainResultLevel.NOT_ASSESSED, DomainResultLevel.SEVERE)).toBe('worse');
    });

    it('severe -> not_assessed is better (non-adjacent jump)', async () => {
      expect(await trendFor(DomainResultLevel.SEVERE, DomainResultLevel.NOT_ASSESSED)).toBe('better');
    });

    it('produces exactly 7 trend entries, one per RiskCategory', async () => {
      (sessionRepo.find as jest.Mock).mockResolvedValue([
        buildSession({ id: 's1', completedAt: new Date('2026-07-01T00:00:00.000Z') }),
        buildSession({ id: 's2', completedAt: new Date('2026-07-10T00:00:00.000Z') }),
      ]);
      (riskSummaryRepo.find as jest.Mock).mockResolvedValue([]);
      (staffRepo.find as jest.Mock).mockResolvedValue([buildStaff()]);

      const result = await service.getHistory(STUDENT_ID);
      expect(result.trends).toHaveLength(7);
      expect(result.trends?.every((t) => t.trend === 'stable')).toBe(true);
    });
  });
});
