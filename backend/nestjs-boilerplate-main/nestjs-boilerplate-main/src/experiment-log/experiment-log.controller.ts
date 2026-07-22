import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
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
import { ExperimentLogService } from './experiment-log.service';
import { UpsertExperimentLogDto } from './dto/upsert-experiment-log.dto';
import { QueryExperimentLogDto } from './dto/query-experiment-log.dto';

const WRITE_BYPASS_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);
// FR-P3-ER-05 grants Section Head the same full oversight access as Principal for the history
// view specifically — a deliberately broader set than WRITE_BYPASS_ROLES above.
const FULL_ACCESS_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head]);

@ApiTags('Experiment Log')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'experiment-logs', version: '1' })
export class ExperimentLogController {
  constructor(
    private readonly experimentLogService: ExperimentLogService,
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
    return roleId !== undefined && WRITE_BYPASS_ROLES.has(roleId);
  }

  private hasFullAccess(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && FULL_ACCESS_ROLES.has(roleId);
  }

  @Get('bookings/:bookingId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A session's pre-fill context (date/class/subject/lab) and its experiment log, if any" })
  async findForBooking(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.experimentLogService.findForBooking(bookingId, staffId, this.isPrivileged(req));
  }

  @Put('bookings/:bookingId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log (or edit) the experiment conducted in a lab session' })
  async upsertForBooking(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Body() dto: UpsertExperimentLogDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.experimentLogService.upsertForBooking(bookingId, dto, staffId, this.isPrivileged(req));
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Searchable experiment log history, filterable by lab/subject/class/date range — full access for Section Head and Principal, own sessions only for a teacher' })
  async findFiltered(
    @Query() dto: QueryExperimentLogDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.experimentLogService.findFiltered(dto, staffId, this.hasFullAccess(req));
  }
}
