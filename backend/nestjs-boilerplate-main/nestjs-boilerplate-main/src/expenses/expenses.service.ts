import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExpenseApprovalEntity,
  ExpenseStatus,
} from './entities/expense-approval.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(ExpenseApprovalEntity)
    private readonly expenseRepo: Repository<ExpenseApprovalEntity>,

    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(requestedById: string, dto: CreateExpenseDto): Promise<ExpenseApprovalEntity> {
    const expense = this.expenseRepo.create({
      requestedById,
      amount: dto.amount,
      category: dto.category,
      description: dto.description,
      status: ExpenseStatus.PENDING,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll(requestedById?: string): Promise<ExpenseApprovalEntity[]> {
    return this.expenseRepo.find({
      where: requestedById ? { requestedById } : {},
      relations: ['requestedBy', 'decidedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async decide(
    id: string,
    decision: ExpenseStatus.APPROVED | ExpenseStatus.REJECTED,
    decidedByStaffId: string,
    decisionNote?: string,
  ): Promise<ExpenseApprovalEntity> {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: ['requestedBy'],
    });
    if (!expense) {
      throw new NotFoundException(`Expense approval request ${id} not found.`);
    }
    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException(
        `Expense request has already been ${expense.status}.`,
      );
    }

    expense.status = decision;
    expense.decidedById = decidedByStaffId;
    expense.decidedAt = new Date();
    expense.decisionNote = decisionNote ?? null;
    await this.expenseRepo.save(expense);

    await this.auditService.log({
      actorId: decidedByStaffId,
      action: decision === ExpenseStatus.APPROVED ? 'approve' : 'reject',
      targetType: 'expense',
      targetId: id,
      reason: decisionNote,
    });

    const verb = decision === ExpenseStatus.APPROVED ? 'approved' : 'rejected';
    await this.notificationService.createForStaff(
      expense.requestedById,
      `Expense Request ${decision === ExpenseStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      `Your expense request (${expense.category}, LKR ${expense.amount}) has been ${verb}.${decisionNote ? ' Note: ' + decisionNote : ''}`,
      'expense_decision',
    );

    return expense;
  }
}
