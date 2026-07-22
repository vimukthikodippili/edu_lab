import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { LabService } from './lab.service';
import { LabBookingService } from './lab-booking.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { ToggleLabMaintenanceDto } from './dto/toggle-lab-maintenance.dto';
import { CreateLabBookingDto } from './dto/create-lab-booking.dto';
import { CreateRecurringLabBookingDto } from './dto/create-recurring-lab-booking.dto';

/** "As a principal or admin..." — management routes (create/update/delete a lab) are
 * admin/principal only, deliberately narrower than the Sport precedent (which also allows
 * section_head). The maintenance-toggle route uses the same role set as
 * SnapshotController.acknowledgeAlert (teacher/admin/principal) — Lab In-Charge is a staff
 * *assignment* on the row, not a portal role, so the real narrowing happens inside
 * LabService.toggleMaintenance's ownership check, not the guard. */
const MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

@ApiTags('Labs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'labs', version: '1' })
export class LabController {
  constructor(
    private readonly labService: LabService,
    private readonly labBookingService: LabBookingService,
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

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all registered labs' })
  async findAll() {
    return this.labService.findAll();
  }

  @Get('directory')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'School-wide lab directory with a live Available/Booked/Maintenance badge' })
  async getDirectory() {
    return this.labService.getDirectory();
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new lab' })
  async create(@Body() dto: CreateLabDto) {
    return this.labService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a registered lab' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateLabDto,
  ) {
    return this.labService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lab' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.labService.delete(id);
  }

  @Patch(':id/maintenance')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle maintenance mode — the assigned Lab In-Charge, or Admin/Principal' })
  async toggleMaintenance(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ToggleLabMaintenanceDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.labService.toggleMaintenance(id, staffId, this.isPrivileged(req), dto.isUnderMaintenance);
  }

  @Post(':id/bookings')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Book a lab for a date/period — blocked (409) on maintenance or an existing confirmed booking for the same slot' })
  async createBooking(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateLabBookingDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.labBookingService.createBooking(id, dto, staffId, this.isPrivileged(req));
  }

  @Post(':id/bookings/recurring')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Book a lab every matching weekday+period across a term — conflicting dates are skipped, not aborted' })
  async createRecurringBooking(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateRecurringLabBookingDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.labBookingService.createRecurringBooking(id, dto, staffId, this.isPrivileged(req));
  }

  @Patch(':id/bookings/:bookingId/cancel')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking — the booking teacher, or Admin/Principal/Section Head' })
  async cancelBooking(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.labBookingService.cancelBooking(id, bookingId, staffId, this.isPrivileged(req));
  }

  @Get(':id/bookings')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A lab's bookings — most recent first, or filtered to a single Monday-anchored week via ?weekStart=" })
  async findBookings(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.labBookingService.findByLab(id, weekStart);
  }
}
