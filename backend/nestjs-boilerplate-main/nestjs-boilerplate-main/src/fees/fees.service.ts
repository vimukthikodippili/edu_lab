import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  In,
  IsNull,
  LessThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { FeeStructureEntity } from './entities/fee-structure.entity';
import { InvoiceEntity, InvoiceStatus } from './entities/invoice.entity';
import {
  FeeWaiverRequestEntity,
  FeeWaiverStatus,
} from './entities/fee-waiver-request.entity';
import {
  StudentEntity,
  StudentStatus,
} from '../students/entities/student.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { CreateFeeWaiverRequestDto } from './dto/create-fee-waiver-request.dto';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';

const DEFAULT_REMINDER_DAYS_BEFORE = 7;

export interface SendDueSoonRemindersSummary {
  invoicesProcessed: number;
  remindersSent: number;
}

export interface SendOverdueNoticesSummary {
  invoicesFlagged: number;
  noticesSent: number;
}

export interface GenerateInvoicesSummary {
  termId: number;
  generatedCount: number;
  skippedAlreadyExistsCount: number;
  skippedNoFeeStructureCount: number;
}

export type InvoiceWithEffectiveStatus = Pick<
  InvoiceEntity,
  'id' | 'studentId' | 'termId' | 'amount' | 'status' | 'dueDate' | 'createdAt' | 'updatedAt'
> & {
  effectiveStatus: InvoiceStatus;
};

export interface InvoiceListRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  termId: number;
  amount: number;
  discountAmount: number;
  payableAmount: number;
  status: InvoiceStatus;
  effectiveStatus: InvoiceStatus;
  dueDate: Date;
}

export interface FeeWaiverRequestListRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  invoiceId: string;
  invoiceAmount: number;
  invoiceDueDate: Date;
  requestedDiscountAmount: number;
  reason: string;
  status: FeeWaiverStatus;
  requestedById: string;
  decidedById: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}

function withEffectiveStatus(invoice: InvoiceEntity): InvoiceWithEffectiveStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const effectiveStatus =
    invoice.status === InvoiceStatus.PENDING && dueDate < today
      ? InvoiceStatus.OVERDUE
      : invoice.status;

  return { ...invoice, effectiveStatus };
}

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectRepository(FeeStructureEntity)
    private readonly feeStructureRepo: Repository<FeeStructureEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,
    @InjectRepository(FeeWaiverRequestEntity)
    private readonly waiverRequestRepo: Repository<FeeWaiverRequestEntity>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAllStructures(
    gradeId?: number,
    termId?: number,
  ): Promise<FeeStructureEntity[]> {
    const where: Record<string, unknown> = {};
    if (gradeId) where.gradeId = gradeId;
    if (termId) where.termId = termId;
    return this.feeStructureRepo.find({ where, order: { feeCategory: 'ASC' } });
  }

  async createStructure(
    dto: CreateFeeStructureDto,
  ): Promise<FeeStructureEntity> {
    const structure = this.feeStructureRepo.create({
      gradeId: dto.gradeId,
      termId: dto.termId,
      feeCategory: dto.feeCategory,
      amount: String(dto.amount),
    });
    try {
      return await this.feeStructureRepo.save(structure);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        throw new ConflictException(
          `A fee structure for this grade, term, and category already exists.`,
        );
      }
      throw err;
    }
  }

  async updateStructure(
    id: number,
    dto: UpdateFeeStructureDto,
  ): Promise<FeeStructureEntity> {
    const structure = await this.feeStructureRepo.findOne({ where: { id } });
    if (!structure) {
      throw new NotFoundException(`Fee structure ${id} not found.`);
    }
    if (dto.gradeId !== undefined) structure.gradeId = dto.gradeId;
    if (dto.termId !== undefined) structure.termId = dto.termId;
    if (dto.feeCategory !== undefined) structure.feeCategory = dto.feeCategory;
    if (dto.amount !== undefined) structure.amount = String(dto.amount);

    try {
      return await this.feeStructureRepo.save(structure);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        throw new ConflictException(
          `A fee structure for this grade, term, and category already exists.`,
        );
      }
      throw err;
    }
  }

  async removeStructure(id: number): Promise<void> {
    const structure = await this.feeStructureRepo.findOne({ where: { id } });
    if (!structure) {
      throw new NotFoundException(`Fee structure ${id} not found.`);
    }
    await this.feeStructureRepo.remove(structure);
  }

  async generateInvoicesForTerm(
    termId: number,
  ): Promise<GenerateInvoicesSummary> {
    const term = await this.termRepo.findOne({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException(`Academic term ${termId} not found.`);
    }

    const students = await this.studentRepo.find({
      where: { status: StudentStatus.ACTIVE },
    });

    const existingInvoices = await this.invoiceRepo.find({
      where: { termId },
    });
    const existingByStudentId = new Set(
      existingInvoices.map((i) => i.studentId),
    );

    const feeStructures = await this.feeStructureRepo.find({
      where: { termId },
    });
    const amountByGradeId = new Map<number, number>();
    feeStructures.forEach((fs) => {
      const current = amountByGradeId.get(fs.gradeId) ?? 0;
      amountByGradeId.set(fs.gradeId, current + Number(fs.amount));
    });

    let skippedAlreadyExistsCount = 0;
    let skippedNoFeeStructureCount = 0;
    const toCreate: InvoiceEntity[] = [];

    for (const student of students) {
      if (existingByStudentId.has(student.id)) {
        skippedAlreadyExistsCount += 1;
        continue;
      }

      const amount = amountByGradeId.get(student.gradeId);
      if (!amount || amount <= 0) {
        skippedNoFeeStructureCount += 1;
        continue;
      }

      toCreate.push(
        this.invoiceRepo.create({
          studentId: student.id,
          termId,
          amount: String(amount),
          status: InvoiceStatus.PENDING,
          dueDate: term.endDate,
        }),
      );
    }

    if (toCreate.length > 0) {
      await this.invoiceRepo.save(toCreate);
    }

    return {
      termId,
      generatedCount: toCreate.length,
      skippedAlreadyExistsCount,
      skippedNoFeeStructureCount,
    };
  }

  async findInvoices(
    termId?: number,
    gradeId?: number,
  ): Promise<InvoiceListRow[]> {
    const where: Record<string, unknown> = {};
    if (termId) where.termId = termId;

    const invoices = await this.invoiceRepo.find({ where });
    const studentIds = invoices.map((i) => i.studentId);
    const students = studentIds.length
      ? await this.studentRepo.findBy({ id: In(studentIds) })
      : [];
    const studentById = new Map(students.map((s) => [s.id, s]));

    return invoices
      .filter((i) => {
        if (!gradeId) return true;
        return studentById.get(i.studentId)?.gradeId === gradeId;
      })
      .map((i) => {
        const enriched = withEffectiveStatus(i);
        const student = studentById.get(i.studentId);
        return {
          id: i.id,
          studentId: i.studentId,
          studentName: student
            ? `${student.lastName}, ${student.firstName}`
            : 'Unknown',
          admissionNumber: student?.admissionNumber ?? '—',
          termId: i.termId,
          amount: Number(i.amount),
          discountAmount: Number(i.discountAmount),
          payableAmount: Number(i.amount) - Number(i.discountAmount),
          status: i.status,
          effectiveStatus: enriched.effectiveStatus,
          dueDate: i.dueDate,
        };
      });
  }

  async getInvoicesForStudent(
    studentId: string,
  ): Promise<InvoiceWithEffectiveStatus[]> {
    const invoices = await this.invoiceRepo.find({ where: { studentId } });
    return invoices.map(withEffectiveStatus);
  }

  private async loadStudentsWithGuardians(
    studentIds: string[],
  ): Promise<Map<string, StudentEntity>> {
    if (studentIds.length === 0) return new Map();
    const students = await this.studentRepo.find({
      where: { id: In(studentIds) },
      relations: ['studentGuardians', 'studentGuardians.guardian'],
    });
    return new Map(students.map((s) => [s.id, s]));
  }

  async sendDueSoonReminders(
    reminderDaysBefore = DEFAULT_REMINDER_DAYS_BEFORE,
  ): Promise<SendDueSoonRemindersSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + reminderDaysBefore);

    const invoices = await this.invoiceRepo.find({
      where: {
        status: InvoiceStatus.PENDING,
        dueDate: Between(today, windowEnd),
        dueSoonReminderSentAt: IsNull(),
      },
    });

    if (invoices.length === 0) {
      return { invoicesProcessed: 0, remindersSent: 0 };
    }

    const studentById = await this.loadStudentsWithGuardians(
      invoices.map((i) => i.studentId),
    );

    let remindersSent = 0;
    const toSave: InvoiceEntity[] = [];

    for (const invoice of invoices) {
      const student = studentById.get(invoice.studentId);
      const guardians = student
        ? student.studentGuardians.map((sg) => sg.guardian)
        : [];

      const outcomes = await Promise.allSettled(
        guardians.map((guardian) =>
          this.notificationService.createForGuardian(
            guardian.id,
            'Fee Payment Due Soon',
            `A fee payment of Rs. ${invoice.amount} for ${student?.firstName} ${student?.lastName} is due on ${new Date(invoice.dueDate).toLocaleDateString()}.`,
            'fee_due_soon',
            { invoiceId: invoice.id, studentId: invoice.studentId, dueDate: invoice.dueDate },
          ),
        ),
      );

      outcomes.forEach((outcome) => {
        if (outcome.status === 'fulfilled') {
          remindersSent += 1;
        } else {
          this.logger.error(
            `Failed to send due-soon reminder for invoice ${invoice.id}: ${outcome.reason}`,
          );
        }
      });

      invoice.dueSoonReminderSentAt = new Date();
      toSave.push(invoice);
    }

    await this.invoiceRepo.save(toSave);

    return { invoicesProcessed: invoices.length, remindersSent };
  }

  async sendOverdueNotices(): Promise<SendOverdueNoticesSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceRepo.find({
      where: {
        status: InvoiceStatus.PENDING,
        dueDate: LessThan(today),
      },
    });

    if (invoices.length === 0) {
      return { invoicesFlagged: 0, noticesSent: 0 };
    }

    const studentById = await this.loadStudentsWithGuardians(
      invoices.map((i) => i.studentId),
    );

    let noticesSent = 0;
    const toSave: InvoiceEntity[] = [];

    for (const invoice of invoices) {
      const student = studentById.get(invoice.studentId);
      const guardians = student
        ? student.studentGuardians.map((sg) => sg.guardian)
        : [];

      const outcomes = await Promise.allSettled(
        guardians.map((guardian) =>
          this.notificationService.createForGuardian(
            guardian.id,
            'Fee Payment Overdue',
            `A fee payment of Rs. ${invoice.amount} for ${student?.firstName} ${student?.lastName} was due on ${new Date(invoice.dueDate).toLocaleDateString()} and remains unpaid.`,
            'fee_overdue',
            { invoiceId: invoice.id, studentId: invoice.studentId, dueDate: invoice.dueDate },
          ),
        ),
      );

      outcomes.forEach((outcome) => {
        if (outcome.status === 'fulfilled') {
          noticesSent += 1;
        } else {
          this.logger.error(
            `Failed to send overdue notice for invoice ${invoice.id}: ${outcome.reason}`,
          );
        }
      });

      invoice.status = InvoiceStatus.OVERDUE;
      toSave.push(invoice);
    }

    await this.invoiceRepo.save(toSave);

    return { invoicesFlagged: toSave.length, noticesSent };
  }

  async createWaiverRequest(
    dto: CreateFeeWaiverRequestDto,
    requestedByStaffId: string,
  ): Promise<FeeWaiverRequestEntity> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${dto.invoiceId} not found.`);
    }

    const outstandingBalance = Number(invoice.amount) - Number(invoice.discountAmount);
    if (dto.requestedDiscountAmount > outstandingBalance) {
      throw new UnprocessableEntityException(
        `Requested discount (Rs. ${dto.requestedDiscountAmount}) exceeds the invoice's outstanding balance (Rs. ${outstandingBalance}).`,
      );
    }

    const existingPending = await this.waiverRequestRepo.findOne({
      where: { invoiceId: dto.invoiceId, status: FeeWaiverStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException(
        'A pending waiver request already exists for this invoice.',
      );
    }

    const request = this.waiverRequestRepo.create({
      studentId: invoice.studentId,
      invoiceId: dto.invoiceId,
      requestedDiscountAmount: String(dto.requestedDiscountAmount),
      reason: dto.reason,
      status: FeeWaiverStatus.PENDING,
      requestedById: requestedByStaffId,
    });

    return this.waiverRequestRepo.save(request);
  }

  async findWaiverRequests(
    status?: FeeWaiverStatus,
  ): Promise<FeeWaiverRequestListRow[]> {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const requests = await this.waiverRequestRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    if (requests.length === 0) return [];

    const studentIds = [...new Set(requests.map((r) => r.studentId))];
    const invoiceIds = [...new Set(requests.map((r) => r.invoiceId))];
    const [students, invoices] = await Promise.all([
      this.studentRepo.findBy({ id: In(studentIds) }),
      this.invoiceRepo.findBy({ id: In(invoiceIds) }),
    ]);
    const studentById = new Map(students.map((s) => [s.id, s]));
    const invoiceById = new Map(invoices.map((i) => [i.id, i]));

    return requests.map((r) => {
      const student = studentById.get(r.studentId);
      const invoice = invoiceById.get(r.invoiceId);
      return {
        id: r.id,
        studentId: r.studentId,
        studentName: student
          ? `${student.lastName}, ${student.firstName}`
          : 'Unknown',
        admissionNumber: student?.admissionNumber ?? '—',
        invoiceId: r.invoiceId,
        invoiceAmount: invoice ? Number(invoice.amount) : 0,
        invoiceDueDate: invoice?.dueDate as Date,
        requestedDiscountAmount: Number(r.requestedDiscountAmount),
        reason: r.reason,
        status: r.status,
        requestedById: r.requestedById,
        decidedById: r.decidedById,
        decidedAt: r.decidedAt,
        decisionNote: r.decisionNote,
        createdAt: r.createdAt,
      };
    });
  }

  async decideWaiverRequest(
    id: string,
    decision: FeeWaiverStatus.APPROVED | FeeWaiverStatus.REJECTED,
    decidedByStaffId: string,
    decisionNote?: string,
  ): Promise<FeeWaiverRequestEntity> {
    const request = await this.waiverRequestRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Fee waiver request ${id} not found.`);
    }
    if (request.status !== FeeWaiverStatus.PENDING) {
      throw new ConflictException(
        `This request has already been ${request.status} and cannot be decided again.`,
      );
    }

    if (decision === FeeWaiverStatus.APPROVED) {
      return this.dataSource.transaction(async (manager) => {
        const invoice = await manager.findOne(InvoiceEntity, {
          where: { id: request.invoiceId },
        });
        if (!invoice) {
          throw new NotFoundException(
            `Invoice ${request.invoiceId} not found.`,
          );
        }

        invoice.discountAmount = String(
          Number(invoice.discountAmount) + Number(request.requestedDiscountAmount),
        );
        await manager.save(InvoiceEntity, invoice);

        request.status = FeeWaiverStatus.APPROVED;
        request.decidedById = decidedByStaffId;
        request.decidedAt = new Date();
        request.decisionNote = decisionNote ?? null;
        const saved = await manager.save(FeeWaiverRequestEntity, request);
        await this.auditService.log({
          actorId: decidedByStaffId,
          action: 'approve',
          targetType: 'fee_waiver',
          targetId: id,
          reason: decisionNote,
        });
        return saved;
      });
    }

    request.status = FeeWaiverStatus.REJECTED;
    request.decidedById = decidedByStaffId;
    request.decidedAt = new Date();
    request.decisionNote = decisionNote ?? null;
    const saved = await this.waiverRequestRepo.save(request);
    await this.auditService.log({
      actorId: decidedByStaffId,
      action: 'reject',
      targetType: 'fee_waiver',
      targetId: id,
      reason: decisionNote,
    });
    return saved;
  }
}
