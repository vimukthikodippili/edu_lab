import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { DecideExpenseDto } from './dto/decide-expense.dto';
import { ExpenseStatus } from './entities/expense-approval.entity';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'expenses', version: '1' })
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new Error('User email not found');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new Error('Staff record not found for this user');
    return staff.id;
  }

  @Post()
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.librarian,
    RoleEnum.accountant,
    RoleEnum.counselor,
    RoleEnum.security_officer,
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateExpenseDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.expensesService.create(staffId, dto);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  async findAll(@Query('requestedById') requestedById?: string) {
    return this.expensesService.findAll(requestedById);
  }

  @Post(':id/approve')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideExpenseDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.expensesService.decide(id, ExpenseStatus.APPROVED, staffId, dto.decisionNote);
  }

  @Post(':id/reject')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideExpenseDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.expensesService.decide(id, ExpenseStatus.REJECTED, staffId, dto.decisionNote);
  }
}
