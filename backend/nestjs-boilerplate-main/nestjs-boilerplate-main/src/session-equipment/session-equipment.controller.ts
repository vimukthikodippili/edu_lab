import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { SessionEquipmentService } from './session-equipment.service';
import { DamageReportService } from './damage-report.service';
import { SubmitSessionReportDto } from './dto/submit-session-report.dto';
import { GetDamageReportsDto } from './dto/get-damage-reports.dto';

const MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

@ApiTags('Session Equipment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'session-equipment', version: '1' })
export class SessionEquipmentController {
  constructor(
    private readonly sessionEquipmentService: SessionEquipmentService,
    private readonly damageReportService: DamageReportService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException('No staff record linked to your account.');
    }
    return staff.id;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && MANAGEMENT_ROLES.has(roleId);
  }

  @Get('bookings/:bookingId/report')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A session's already-logged equipment usage and damage reports" })
  async findForBooking(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sessionEquipmentService.findForBooking(bookingId, staffId, this.isPrivileged(req));
  }

  @Post('bookings/:bookingId/report')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log equipment used and any damage/missing items for a lab session' })
  async submitSessionReport(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() dto: SubmitSessionReportDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sessionEquipmentService.submitSessionReport(bookingId, dto, staffId, this.isPrivileged(req));
  }

  @Get('damage-reports')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Damage/missing reports, filterable by lab, date range, and type — Lab In-Charge and Principal view' })
  async findDamageReports(
    @Query() dto: GetDamageReportsDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.damageReportService.findReports(dto, staffId, this.isPrivileged(req));
  }
}
