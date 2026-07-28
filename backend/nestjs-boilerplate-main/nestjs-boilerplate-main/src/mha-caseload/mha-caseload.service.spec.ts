import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { MhaCaseloadService } from './mha-caseload.service';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn().mockResolvedValue([]),
  query: jest.fn().mockResolvedValue([]),
});

function buildStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return {
    id: 'student-1',
    firstName: 'John',
    lastName: 'Perera',
    gradeId: 10,
    grade: { id: 10, level: 10, name: 'Grade 10' },
    classSectionId: 1,
    classSection: { id: 1, name: 'A', academicYear: '2026', gradeId: 10 },
    ...overrides,
  } as StudentEntity;
}

// Matches the raw shape MhaCaseloadService.getCaseload() expects back from sessionRepo.query() —
// i.e. exactly what the SQL aggregation (verified separately via live QA, not here) would return.
function buildRawRow(overrides: Record<string, unknown> = {}) {
  return {
    studentId: 'student-1',
    latestSessionId: 'session-latest',
    latestSessionDate: new Date('2026-07-20T00:00:00.000Z'),
    highestRiskLevel: DomainResultLevel.MODERATE,
    hasPendingActions: false,
    hasSafetyFlag: false,
    ...overrides,
  };
}

describe('MhaCaseloadService', () => {
  let service: MhaCaseloadService;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let studentRepo: MockRepo<StudentEntity>;

  beforeEach(async () => {
    sessionRepo = repoMock<MhaSessionEntity>();
    studentRepo = repoMock<StudentEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MhaCaseloadService,
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    service = module.get(MhaCaseloadService);
  });

  it('returns [] without querying students when the SQL aggregation returns no rows', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([]);

    const result = await service.getCaseload({});

    expect(result).toEqual([]);
    expect(studentRepo.find).not.toHaveBeenCalled();
  });

  it('passes riskLevel/hasPendingActions/hasSafetyFlag filters through as SQL params, defaulting to null when omitted', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([]);

    await service.getCaseload({});
    expect((sessionRepo.query as jest.Mock).mock.calls[0][1]).toEqual([null, null, null]);

    await service.getCaseload({ riskLevel: DomainResultLevel.HIGH, hasPendingActions: true, hasSafetyFlag: false });
    expect((sessionRepo.query as jest.Mock).mock.calls[1][1]).toEqual([DomainResultLevel.HIGH, true, false]);
  });

  it('maps a raw row + batch-loaded student into CaseloadItemDto (name, grade format, pass-through fields)', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([buildRawRow()]);
    (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent()]);

    const result = await service.getCaseload({});

    expect(result).toEqual([
      {
        studentId: 'student-1',
        studentName: 'John Perera',
        grade: '10A',
        latestSessionId: 'session-latest',
        latestSessionDate: new Date('2026-07-20T00:00:00.000Z'),
        highestRiskLevel: DomainResultLevel.MODERATE,
        hasPendingActions: false,
        hasSafetyFlag: false,
      },
    ]);
  });

  it('applies the gradeId filter in-memory after batch-loading students, excluding non-matching grades', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([
      buildRawRow({ studentId: 'student-1' }),
      buildRawRow({ studentId: 'student-2' }),
    ]);
    (studentRepo.find as jest.Mock).mockResolvedValue([
      buildStudent({ id: 'student-1', gradeId: 10 }),
      buildStudent({ id: 'student-2', gradeId: 11, grade: { id: 11, level: 11, name: 'Grade 11' } }),
    ]);

    const result = await service.getCaseload({ gradeId: 11 });

    expect(result).toHaveLength(1);
    expect(result[0].studentId).toBe('student-2');
  });

  // AI-prompt test (a) — "a student with a prior safety flag shows the Safety badge even if the
  // latest session has no safety flag." The cross-session lookback itself lives in the raw SQL's
  // EXISTS subquery (join through domain_result -> mha_session, not scoped to the latest session),
  // which a mocked `.query()` return value cannot actually exercise — that half is proven by live
  // QA against real seeded multi-session data (see plan's verification section). What IS proven
  // here, at the service layer: the service trusts and passes through whatever the SQL aggregate
  // says for `hasSafetyFlag`, independent of `highestRiskLevel`'s own (latest-session-only) value —
  // it never re-derives or overwrites hasSafetyFlag from the latest session's data.
  it('surfaces hasSafetyFlag: true from the raw aggregate even when the latest session itself has none', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([
      buildRawRow({ hasSafetyFlag: true, highestRiskLevel: DomainResultLevel.LOW }),
    ]);
    (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent()]);

    const result = await service.getCaseload({});

    expect(result[0].hasSafetyFlag).toBe(true);
    expect(result[0].highestRiskLevel).toBe(DomainResultLevel.LOW);
  });

  // AI-prompt test (b) — "filter by hasPendingActions only returns students with at least one
  // SessionAction.status='open'." The filtering itself happens in the SQL WHERE clause (proven by
  // the "passes filters through as SQL params" test above + live QA); what's proven here is that
  // the service doesn't second-guess or drop the flag it gets back — a row the SQL already filtered
  // in is surfaced with hasPendingActions: true untouched.
  it('surfaces hasPendingActions: true unmodified when filtering by hasPendingActions=true', async () => {
    (sessionRepo.query as jest.Mock).mockResolvedValue([buildRawRow({ hasPendingActions: true })]);
    (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent()]);

    const result = await service.getCaseload({ hasPendingActions: true });

    expect(result[0].hasPendingActions).toBe(true);
  });
});
