import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { FeesService } from './fees.service';
import { FeeWaiverStatus } from './entities/fee-waiver-request.entity';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { SendDueSoonRemindersDto } from './dto/send-due-soon-reminders.dto';
import { CreateFeeWaiverRequestDto } from './dto/create-fee-waiver-request.dto';
import { DecideFeeWaiverRequestDto } from './dto/decide-fee-waiver-request.dto';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'fees', version: '1' })
export class FeesController {
  constructor(
    private readonly feesService: FeesService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException(
        'No staff record linked to your account.',
      );
    return staff.id;
  }

  @Get('structure')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List fee structure rows, optionally filtered by grade/term' })
  findAllStructures(
    @Query('gradeId') gradeId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.feesService.findAllStructures(
      gradeId ? Number(gradeId) : undefined,
      termId ? Number(termId) : undefined,
    );
  }

  @Post('structure')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fee structure row for a grade and term' })
  createStructure(@Body() dto: CreateFeeStructureDto) {
    return this.feesService.createStructure(dto);
  }

  @Patch('structure/:id')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a fee structure row' })
  updateStructure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeeStructureDto,
  ) {
    return this.feesService.updateStructure(id, dto);
  }

  @Delete('structure/:id')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a fee structure row' })
  removeStructure(@Param('id', ParseIntPipe) id: number) {
    return this.feesService.removeStructure(id);
  }

  @Post('invoices/generate')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate invoices for all active students for a term, based on their grade fee structure (idempotent)',
  })
  generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.feesService.generateInvoicesForTerm(dto.termId);
  }

  @Get('invoices')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List generated invoices, optionally filtered by term/grade' })
  findInvoices(
    @Query('termId') termId?: string,
    @Query('gradeId') gradeId?: string,
  ) {
    return this.feesService.findInvoices(
      termId ? Number(termId) : undefined,
      gradeId ? Number(gradeId) : undefined,
    );
  }

  @Post('reminders/due-soon')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send a reminder to guardians for pending invoices due within the configured window (idempotent)',
  })
  sendDueSoonReminders(@Body() dto: SendDueSoonRemindersDto) {
    return this.feesService.sendDueSoonReminders(dto.reminderDaysBefore);
  }

  @Post('reminders/overdue')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send an overdue notice to guardians for pending invoices past their due date, and flag them overdue (idempotent)',
  })
  sendOverdueNotices() {
    return this.feesService.sendOverdueNotices();
  }

  @Post('waiver-requests')
  @Roles(RoleEnum.admin, RoleEnum.accountant)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Request a fee waiver/discount on an invoice on a parent\'s behalf (requires Principal approval before it takes effect)',
  })
  async createWaiverRequest(
    @Body() dto: CreateFeeWaiverRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.feesService.createWaiverRequest(dto, staffId);
  }

  @Get('waiver-requests')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.accountant)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'List fee waiver requests, optionally filtered by status (e.g. ?status=pending for the approval queue)',
  })
  findWaiverRequests(@Query('status') status?: FeeWaiverStatus) {
    return this.feesService.findWaiverRequests(status);
  }

  @Post('waiver-requests/:id/approve')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Principal approves a pending fee waiver request, applying the discount to the linked invoice',
  })
  async approveWaiverRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideFeeWaiverRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.feesService.decideWaiverRequest(
      id,
      FeeWaiverStatus.APPROVED,
      staffId,
      dto.decisionNote,
    );
  }

  @Post('waiver-requests/:id/reject')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Principal rejects a pending fee waiver request; the linked invoice is left unchanged',
  })
  async rejectWaiverRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideFeeWaiverRequestDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.feesService.decideWaiverRequest(
      id,
      FeeWaiverStatus.REJECTED,
      staffId,
      dto.decisionNote,
    );
  }
}
