import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
} from '../leave/entities/leave-request.entity';
import {
  ExpenseApprovalEntity,
  ExpenseStatus,
} from '../expenses/entities/expense-approval.entity';
import {
  CounselorCaseEntity,
  CounselorCaseStatus,
  CounselorCaseTriggerType,
} from '../counselor/entities/counselor-case.entity';
import { MhaCaseloadService } from '../mha-caseload/mha-caseload.service';
import { CaseloadItemDto } from '../mha-caseload/dto/caseload-item.dto';
import { PrincipalKpiResponse } from './dto/principal-kpi.response';
import { WellbeingConcernDto } from './dto/wellbeing-concern.dto';

export type ApprovalItemType = 'fee_waiver' | 'leave' | 'expense';

export interface ApprovalQueueItem {
  id: string;
  type: ApprovalItemType;
  requesterName: string;
  requesterDetail: string;
  summary: string;
  reason: string;
  submittedAt: Date;
  status: string;
}

@Injectable()
export class PrincipalService {
  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,

    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,

    @InjectRepository(FeeWaiverRequestEntity)
    private readonly waiverRepo: Repository<FeeWaiverRequestEntity>,

    @InjectRepository(EmergencyAlertEntity)
    private readonly alertRepo: Repository<EmergencyAlertEntity>,

    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRepo: Repository<LeaveRequestEntity>,

    @InjectRepository(ExpenseApprovalEntity)
    private readonly expenseRepo: Repository<ExpenseApprovalEntity>,

    @InjectRepository(CounselorCaseEntity)
    private readonly counselorCaseRepo: Repository<CounselorCaseEntity>,

    private readonly mhaCaseloadService: MhaCaseloadService,
  ) {}

  /** FR-MHA-34/AC #92. Reuses MhaCaseloadService's `highestRiskLevel` (already defined as "max
   * across the student's LATEST completed session's RiskSummary rows" — exactly this AC's
   * definition), filtered to High/Severe. Backs both getKpi()'s count and getWellbeingConcerns()'s
   * list — computed once per call site, not twice. */
  private async getWellbeingConcernRows(): Promise<CaseloadItemDto[]> {
    const caseload = await this.mhaCaseloadService.getCaseload({});
    return caseload.filter((r) => r.highestRiskLevel === 'high' || r.highestRiskLevel === 'severe');
  }

  async getKpi(): Promise<PrincipalKpiResponse> {
    const [
      attendanceRaw,
      feeRaw,
      pendingWaivers,
      activeAlerts,
      pendingLeave,
      pendingExpenses,
      wellbeingRows,
      safetyAlertCount,
    ] = await Promise.all([
        this.attendanceRepo
          .createQueryBuilder('ar')
          .select('COUNT(*)', 'total')
          .addSelect(
            "COUNT(*) FILTER (WHERE ar.status IN ('present','late'))",
            'attended',
          )
          .where('ar.date = CURRENT_DATE')
          .getRawOne<{ total: string; attended: string }>(),

        this.invoiceRepo
          .createQueryBuilder('inv')
          .select('COUNT(*)', 'total')
          .addSelect("COUNT(*) FILTER (WHERE inv.status = 'paid')", 'paid')
          .getRawOne<{ total: string; paid: string }>(),

        this.waiverRepo.count({ where: { status: FeeWaiverStatus.PENDING } }),

        this.alertRepo
          .createQueryBuilder('ea')
          .where("ea.sentAt >= NOW() - INTERVAL '7 days'")
          .getCount(),

        this.leaveRepo.count({ where: { status: LeaveStatus.PENDING } }),

        this.expenseRepo.count({ where: { status: ExpenseStatus.PENDING } }),

        this.getWellbeingConcernRows(),

        // FR-MHA-34/AC #95. upsertSafetyFlagCase() (MHA-133) guarantees at most one OPEN
        // mha_safety_flag CounselorCase per student — a plain count on that (triggerType, status)
        // pair is already the exact, dedup-free count of students with an unresolved safety flag,
        // reusing the existing authoritative record rather than re-deriving it from DomainResult.
        this.counselorCaseRepo.count({
          where: {
            triggerType: CounselorCaseTriggerType.MHA_SAFETY_FLAG,
            status: CounselorCaseStatus.OPEN,
          },
        }),
      ]);

    const total = +(attendanceRaw?.total ?? 0);
    const attended = +(attendanceRaw?.attended ?? 0);
    const attendanceHasData = total > 0;
    const attendanceRate = attendanceHasData
      ? Math.round((attended / total) * 100)
      : 0;

    const feeTotal = +(feeRaw?.total ?? 0);
    const feePaid = +(feeRaw?.paid ?? 0);
    const feeCollectionRate =
      feeTotal > 0 ? Math.round((feePaid / feeTotal) * 100) : 0;

    return {
      attendanceRate,
      attendanceHasData,
      feeCollectionRate,
      pendingApprovals: pendingWaivers + pendingLeave + pendingExpenses,
      activeAlerts,
      wellbeingConcernCount: wellbeingRows.length,
      safetyAlertCount,
    };
  }

  /** FR-MHA-34/AC #94. De-identified-of-clinical-detail drill-down for the wellbeing KPI — name,
   * grade, and overall severity only; no domain names, no risk-category names, no notes. */
  async getWellbeingConcerns(): Promise<WellbeingConcernDto[]> {
    const rows = await this.getWellbeingConcernRows();
    return rows.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      grade: r.grade,
      maxLevel: r.highestRiskLevel,
    }));
  }

  async getApprovalQueue(): Promise<ApprovalQueueItem[]> {
    const [waivers, leaves, expenses] = await Promise.all([
      this.waiverRepo.find({
        where: { status: FeeWaiverStatus.PENDING },
        relations: ['student'],
        order: { createdAt: 'DESC' },
      }),
      this.leaveRepo.find({
        where: { status: LeaveStatus.PENDING },
        relations: ['staff'],
        order: { createdAt: 'DESC' },
      }),
      this.expenseRepo.find({
        where: { status: ExpenseStatus.PENDING },
        relations: ['requestedBy'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const items: ApprovalQueueItem[] = [
      ...waivers.map((w) => ({
        id: w.id,
        type: 'fee_waiver' as ApprovalItemType,
        requesterName: w.student
          ? `${w.student.firstName} ${w.student.lastName}`
          : 'Unknown Student',
        requesterDetail: `Student ID: ${w.studentId}`,
        summary: `Waiver: LKR ${w.requestedDiscountAmount}`,
        reason: w.reason,
        submittedAt: w.createdAt,
        status: w.status,
      })),
      ...leaves.map((l) => ({
        id: l.id,
        type: 'leave' as ApprovalItemType,
        requesterName: l.staff
          ? `${l.staff.firstName} ${l.staff.lastName}`
          : 'Unknown Staff',
        requesterDetail: `${l.leaveType} leave`,
        summary: `${new Date(l.startDate).toISOString().slice(0, 10)} → ${new Date(l.endDate).toISOString().slice(0, 10)}`,
        reason: l.reason,
        submittedAt: l.createdAt,
        status: l.status,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as ApprovalItemType,
        requesterName: e.requestedBy
          ? `${e.requestedBy.firstName} ${e.requestedBy.lastName}`
          : 'Unknown Staff',
        requesterDetail: e.category,
        summary: `LKR ${e.amount} — ${e.description.slice(0, 60)}`,
        reason: e.description,
        submittedAt: e.createdAt,
        status: e.status,
      })),
    ];

    return items.sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }
}
