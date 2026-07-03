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
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { DecideLeaveRequestDto } from './dto/decide-leave-request.dto';
import { LeaveStatus } from './entities/leave-request.entity';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'leave', version: '1' })
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
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

  @Post('requests')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal, RoleEnum.librarian, RoleEnum.accountant, RoleEnum.counselor, RoleEnum.security_officer)
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Body() dto: CreateLeaveRequestDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.leaveService.create(staffId, dto);
  }

  @Get('requests/me')
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
  @HttpCode(HttpStatus.OK)
  async findMyRequests(@Request() req: { user: { id: string } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.leaveService.findAll(staffId);
  }

  @Get('requests')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  async findAll(@Query('staffId') staffId?: string) {
    return this.leaveService.findAll(staffId);
  }

  @Post('requests/:id/approve')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.leaveService.decide(id, LeaveStatus.APPROVED, staffId, dto.decisionNote);
  }

  @Post('requests/:id/reject')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.leaveService.decide(id, LeaveStatus.REJECTED, staffId, dto.decisionNote);
  }
}
