import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { PrincipalService } from './principal.service';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { InvoiceEntity } from '../fees/entities/invoice.entity';
import {
  FeeWaiverRequestEntity,
  FeeWaiverStatus,
} from '../fees/entities/fee-waiver-request.entity';
import { EmergencyAlertEntity } from '../communication/entities/emergency-alert.entity';
import {
  LeaveRequestEntity,
  LeaveStatus,
  LeaveType,
} from '../leave/entities/leave-request.entity';
import {
  ExpenseApprovalEntity,
  ExpenseCategory,
  ExpenseStatus,
} from '../expenses/entities/expense-approval.entity';
import {
  CounselorCaseEntity,
  CounselorCaseStatus,
  CounselorCaseTriggerType,
} from '../counselor/entities/counselor-case.entity';
import { MhaCaseloadService } from '../mha-caseload/mha-caseload.service';
import { CaseloadItemDto } from '../mha-caseload/dto/caseload-item.dto';

// ─── Mock factories ───────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  count: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeQb = (raw: Record<string, string>, count = 0) => {
  const qb: Record<string, jest.Mock> = {};
  ['select', 'addSelect', 'where'].forEach((m) => {
    qb[m] = jest.fn().mockReturnThis();
  });
  qb.getRawOne = jest.fn().mockResolvedValue(raw);
  qb.getCount = jest.fn().mockResolvedValue(count);
  return qb;
};

// ─── Shared module builder ────────────────────────────────────────────────────

let attendanceRepo: MockRepo<AttendanceRecordEntity>;
let invoiceRepo: MockRepo<InvoiceEntity>;
let waiverRepo: MockRepo<FeeWaiverRequestEntity>;
let alertRepo: MockRepo<EmergencyAlertEntity>;
let leaveRepo: MockRepo<LeaveRequestEntity>;
let expenseRepo: MockRepo<ExpenseApprovalEntity>;
let counselorCaseRepo: MockRepo<CounselorCaseEntity>;
let mhaCaseloadService: { getCaseload: jest.Mock };

const buildModule = async (): Promise<PrincipalService> => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PrincipalService,
      { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
      { provide: getRepositoryToken(InvoiceEntity), useValue: invoiceRepo },
      { provide: getRepositoryToken(FeeWaiverRequestEntity), useValue: waiverRepo },
      { provide: getRepositoryToken(EmergencyAlertEntity), useValue: alertRepo },
      { provide: getRepositoryToken(LeaveRequestEntity), useValue: leaveRepo },
      { provide: getRepositoryToken(ExpenseApprovalEntity), useValue: expenseRepo },
      { provide: getRepositoryToken(CounselorCaseEntity), useValue: counselorCaseRepo },
      { provide: MhaCaseloadService, useValue: mhaCaseloadService },
    ],
  }).compile();

  return module.get<PrincipalService>(PrincipalService);
};

function caseloadRow(overrides: Partial<CaseloadItemDto> = {}): CaseloadItemDto {
  return {
    studentId: 'student-1',
    studentName: 'Kasun Perera',
    grade: '10A',
    latestSessionId: 'session-1',
    latestSessionDate: new Date('2026-07-01T00:00:00.000Z'),
    highestRiskLevel: 'moderate',
    hasPendingActions: false,
    hasSafetyFlag: false,
    ...overrides,
  } as CaseloadItemDto;
}

// ─── KPI Tests ───────────────────────────────────────────────────────────────

describe('PrincipalService.getKpi', () => {
  let service: PrincipalService;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>();
    invoiceRepo = repoMock<InvoiceEntity>();
    waiverRepo = repoMock<FeeWaiverRequestEntity>();
    alertRepo = repoMock<EmergencyAlertEntity>();
    leaveRepo = repoMock<LeaveRequestEntity>();
    expenseRepo = repoMock<ExpenseApprovalEntity>();
    counselorCaseRepo = repoMock<CounselorCaseEntity>();
    mhaCaseloadService = { getCaseload: jest.fn() };

    // Safe defaults — all channels return zero
    attendanceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '0', attended: '0' }),
    );
    invoiceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '0', paid: '0' }),
    );
    waiverRepo.count!.mockResolvedValue(0);
    alertRepo.createQueryBuilder!.mockReturnValue(makeQb({}, 0));
    leaveRepo.count!.mockResolvedValue(0);
    expenseRepo.count!.mockResolvedValue(0);
    counselorCaseRepo.count!.mockResolvedValue(0);
    mhaCaseloadService.getCaseload.mockResolvedValue([]);

    service = await buildModule();
  });

  // ── 1: All present today ───────────────────────────────────────────────────
  it('returns 100% attendanceRate and attendanceHasData=true when all records are present', async () => {
    attendanceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '10', attended: '10' }),
    );

    const kpi = await service.getKpi();

    expect(kpi.attendanceRate).toBe(100);
    expect(kpi.attendanceHasData).toBe(true);
  });

  // ── 2: No records today ────────────────────────────────────────────────────
  it('returns 0 attendanceRate and attendanceHasData=false when no records exist today', async () => {
    attendanceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '0', attended: '0' }),
    );

    const kpi = await service.getKpi();

    expect(kpi.attendanceRate).toBe(0);
    expect(kpi.attendanceHasData).toBe(false);
  });

  // ── 3: Mix of present + late ───────────────────────────────────────────────
  it('counts late status as attended when computing attendance rate', async () => {
    attendanceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '20', attended: '15' }),
    );

    const kpi = await service.getKpi();

    expect(kpi.attendanceRate).toBe(75);
    expect(kpi.attendanceHasData).toBe(true);
  });

  // ── 4: Half invoices paid ─────────────────────────────────────────────────
  it('returns 50% feeCollectionRate when half of all invoices are paid', async () => {
    invoiceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '10', paid: '5' }),
    );

    const kpi = await service.getKpi();

    expect(kpi.feeCollectionRate).toBe(50);
  });

  // ── 5: No invoices (zero-division safe) ───────────────────────────────────
  it('returns 0% feeCollectionRate without throwing when no invoices exist', async () => {
    invoiceRepo.createQueryBuilder!.mockReturnValue(
      makeQb({ total: '0', paid: '0' }),
    );

    const kpi = await service.getKpi();

    expect(kpi.feeCollectionRate).toBe(0);
  });

  // ── 6: pendingApprovals sums all three sources ────────────────────────────
  it('sums fee waivers + leave + expense pending counts into pendingApprovals', async () => {
    waiverRepo.count!.mockResolvedValue(2);
    leaveRepo.count!.mockResolvedValue(1);
    expenseRepo.count!.mockResolvedValue(3);
    alertRepo.createQueryBuilder!.mockReturnValue(makeQb({}, 4));

    const kpi = await service.getKpi();

    expect(kpi.pendingApprovals).toBe(6); // 2 + 1 + 3
    expect(kpi.activeAlerts).toBe(4);
    expect(waiverRepo.count).toHaveBeenCalledWith({
      where: { status: FeeWaiverStatus.PENDING },
    });
    expect(leaveRepo.count).toHaveBeenCalledWith({
      where: { status: LeaveStatus.PENDING },
    });
    expect(expenseRepo.count).toHaveBeenCalledWith({
      where: { status: ExpenseStatus.PENDING },
    });
  });

  // ── 7: FR-MHA-34 wellbeing/safety-alert KPIs ──────────────────────────────
  it('counts only high/severe caseload rows into wellbeingConcernCount', async () => {
    mhaCaseloadService.getCaseload.mockResolvedValue([
      caseloadRow({ studentId: 's1', highestRiskLevel: 'high' }),
      caseloadRow({ studentId: 's2', highestRiskLevel: 'severe' }),
      caseloadRow({ studentId: 's3', highestRiskLevel: 'moderate' }),
      caseloadRow({ studentId: 's4', highestRiskLevel: 'low' }),
    ]);

    const kpi = await service.getKpi();

    expect(kpi.wellbeingConcernCount).toBe(2);
    expect(mhaCaseloadService.getCaseload).toHaveBeenCalledWith({});
  });

  // AI-prompt test (b) — a student whose latest session has all levels 'low' is excluded.
  it.each([
    ['not_assessed', false],
    ['none', false],
    ['low', false],
    ['moderate', false],
    ['high', true],
    ['severe', true],
  ])('highestRiskLevel=%s -> counted in wellbeingConcernCount: %s', async (level, expected) => {
    mhaCaseloadService.getCaseload.mockResolvedValue([caseloadRow({ highestRiskLevel: level as CaseloadItemDto['highestRiskLevel'] })]);
    const kpi = await service.getKpi();
    expect(kpi.wellbeingConcernCount).toBe(expected ? 1 : 0);
  });

  // AI-prompt test (a) — a student with a resolved (closed) safety case is excluded from
  // safetyAlertCount. Proven at the query-shape level: the count only ever queries OPEN cases,
  // so a CLOSED (resolved) row structurally can never be counted, per MHA-133's own
  // upsertSafetyFlagCase() invariant (at most one OPEN mha_safety_flag case per student).
  it('scopes safetyAlertCount to OPEN mha_safety_flag cases only', async () => {
    counselorCaseRepo.count!.mockResolvedValue(3);

    const kpi = await service.getKpi();

    expect(kpi.safetyAlertCount).toBe(3);
    expect(counselorCaseRepo.count).toHaveBeenCalledWith({
      where: {
        triggerType: CounselorCaseTriggerType.MHA_SAFETY_FLAG,
        status: CounselorCaseStatus.OPEN,
      },
    });
  });
});

describe('PrincipalService.getWellbeingConcerns', () => {
  let service: PrincipalService;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>();
    invoiceRepo = repoMock<InvoiceEntity>();
    waiverRepo = repoMock<FeeWaiverRequestEntity>();
    alertRepo = repoMock<EmergencyAlertEntity>();
    leaveRepo = repoMock<LeaveRequestEntity>();
    expenseRepo = repoMock<ExpenseApprovalEntity>();
    counselorCaseRepo = repoMock<CounselorCaseEntity>();
    mhaCaseloadService = { getCaseload: jest.fn() };

    service = await buildModule();
  });

  it('maps highestRiskLevel to maxLevel and includes only high/severe rows', async () => {
    mhaCaseloadService.getCaseload.mockResolvedValue([
      caseloadRow({ studentId: 's1', studentName: 'Amara Silva', grade: '9B', highestRiskLevel: 'severe' }),
      caseloadRow({ studentId: 's2', studentName: 'Nuwan Perera', grade: '10A', highestRiskLevel: 'low' }),
    ]);

    const result = await service.getWellbeingConcerns();

    expect(result).toEqual([
      { studentId: 's1', studentName: 'Amara Silva', grade: '9B', maxLevel: 'severe' },
    ]);
  });
});

// ─── Approval Queue Test ─────────────────────────────────────────────────────

describe('PrincipalService.getApprovalQueue', () => {
  let service: PrincipalService;

  const now = new Date('2026-07-01T10:00:00Z');
  const earlier = new Date('2026-07-01T08:00:00Z');
  const earliest = new Date('2026-07-01T06:00:00Z');

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>();
    invoiceRepo = repoMock<InvoiceEntity>();
    waiverRepo = repoMock<FeeWaiverRequestEntity>();
    alertRepo = repoMock<EmergencyAlertEntity>();
    leaveRepo = repoMock<LeaveRequestEntity>();
    expenseRepo = repoMock<ExpenseApprovalEntity>();
    counselorCaseRepo = repoMock<CounselorCaseEntity>();
    mhaCaseloadService = { getCaseload: jest.fn() };

    // KPI defaults (not tested here, just prevent errors)
    attendanceRepo.createQueryBuilder!.mockReturnValue(makeQb({ total: '0', attended: '0' }));
    invoiceRepo.createQueryBuilder!.mockReturnValue(makeQb({ total: '0', paid: '0' }));
    waiverRepo.count!.mockResolvedValue(0);
    alertRepo.createQueryBuilder!.mockReturnValue(makeQb({}, 0));
    leaveRepo.count!.mockResolvedValue(0);
    expenseRepo.count!.mockResolvedValue(0);
    counselorCaseRepo.count!.mockResolvedValue(0);
    mhaCaseloadService.getCaseload.mockResolvedValue([]);

    // Queue data — one item from each source type
    waiverRepo.find!.mockResolvedValue([
      {
        id: 'waiver-uuid',
        studentId: 'student-uuid',
        requestedDiscountAmount: '5000',
        reason: 'Financial hardship',
        status: FeeWaiverStatus.PENDING,
        createdAt: earlier,
        student: { firstName: 'Kamal', lastName: 'Perera' },
      } as unknown as FeeWaiverRequestEntity,
    ]);

    leaveRepo.find!.mockResolvedValue([
      {
        id: 'leave-uuid',
        staffId: 'staff-uuid-1',
        leaveType: LeaveType.MEDICAL,
        startDate: new Date('2026-07-10'),
        endDate: new Date('2026-07-12'),
        reason: 'Doctor appointment',
        status: LeaveStatus.PENDING,
        createdAt: now,
        staff: { firstName: 'Nimal', lastName: 'Silva' },
      } as unknown as LeaveRequestEntity,
    ]);

    expenseRepo.find!.mockResolvedValue([
      {
        id: 'expense-uuid',
        requestedById: 'staff-uuid-2',
        amount: 1200,
        category: ExpenseCategory.SUPPLIES,
        description: 'Whiteboard markers for classrooms',
        status: ExpenseStatus.PENDING,
        createdAt: earliest,
        requestedBy: { firstName: 'Sunil', lastName: 'Fernando' },
      } as unknown as ExpenseApprovalEntity,
    ]);

    service = await buildModule();
  });

  it('returns all three approval types in the unioned queue', async () => {
    const queue = await service.getApprovalQueue();

    expect(queue).toHaveLength(3);

    const types = queue.map((item) => item.type);
    expect(types).toContain('fee_waiver');
    expect(types).toContain('leave');
    expect(types).toContain('expense');
  });

  it('sorts queue by submittedAt descending (newest first)', async () => {
    const queue = await service.getApprovalQueue();

    expect(queue[0].id).toBe('leave-uuid');    // now
    expect(queue[1].id).toBe('waiver-uuid');   // earlier
    expect(queue[2].id).toBe('expense-uuid');  // earliest
  });

  it('maps requester names from related entities', async () => {
    const queue = await service.getApprovalQueue();

    const waiver = queue.find((i) => i.type === 'fee_waiver')!;
    expect(waiver.requesterName).toBe('Kamal Perera');

    const leave = queue.find((i) => i.type === 'leave')!;
    expect(leave.requesterName).toBe('Nimal Silva');

    const expense = queue.find((i) => i.type === 'expense')!;
    expect(expense.requesterName).toBe('Sunil Fernando');
  });
});
