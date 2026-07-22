import {
  Controller,
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
import { SnapshotService } from './snapshot.service';
import { SportsService } from './sports.service';
import { QueryCoachAlertsDto } from './dto/query-coach-alerts.dto';

/** FR-P3-AV-02: Section Head is deliberately NOT here — view access is grade-range-scoped (see
 * isViewAuthorized below), not an unconditional bypass. Mirrors SportsController's own split. */
const FULLY_PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

const SECTION_HEAD_ROLE = RoleEnum.section_head;

@ApiTags('Sports Performance Trends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'sports', version: '1' })
export class SnapshotController {
  constructor(
    private readonly snapshotService: SnapshotService,
    private readonly sportsService: SportsService,
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

  private isFullyPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && FULLY_PRIVILEGED_ROLES.has(roleId);
  }

  private isSectionHead(req: { user: { role?: { id?: number } } }): boolean {
    return req.user.role?.id === SECTION_HEAD_ROLE;
  }

  /** Same composite check as SportsController.isViewAuthorized — kept as its own copy per this
   * session's established per-controller-duplication default for this class of boilerplate. */
  private async isViewAuthorized(
    sportId: string,
    req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<boolean> {
    if (this.isFullyPrivileged(req)) return true;
    if (this.isSectionHead(req)) {
      const staffId = await this.resolveStaffId(req.user.id);
      return this.sportsService.isSportViewableBySectionHead(sportId, staffId);
    }
    return false;
  }

  @Get(':id/performance-trends')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Latest week-by-week trend snapshot per student per metric for a sport" })
  async findLatestSnapshots(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.snapshotService.findLatestSnapshots(
      id,
      staffId,
      await this.isViewAuthorized(id, req),
    );
  }

  @Post('analysis/recompute')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger the weekly performance-trend computation now — Admin/Principal only' })
  async recomputeNow() {
    await this.snapshotService.computeAllSnapshots();
    return { message: 'Performance trend snapshots recomputed.' };
  }

  @Get('dashboard/school')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'School-wide sports overview: win rates, top performers, year-on-year distribution — Admin/Principal only' })
  async getSchoolDashboard() {
    return this.snapshotService.getSchoolDashboard();
  }

  @Get('public-board')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'FR-P3-AV-07: optional public sports board — team match results and top-3 performer names only (no per-match metric detail). No @Roles() restriction: any authenticated role may view it once enabled in School Settings.',
  })
  async getPublicSportsBoard() {
    return this.snapshotService.getPublicSportsBoard();
  }

  /** FR-P3-PA-13: Section Head deliberately excluded — a coach alert is a coach-workflow tool
   * with admin/principal escalation, matching the same asymmetry already established for
   * match/training-session management, not the broader "view" role set used for roster/trends. */
  @Get('alerts')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "A coach's own declining-performance alert inbox — Admin/Principal see every alert, a coach sees only their own sport(s)'",
  })
  async findAlerts(
    @Query() query: QueryCoachAlertsDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.snapshotService.findAlertsForCoach(
      staffId,
      this.isFullyPrivileged(req),
      query.acknowledged,
    );
  }

  @Patch('alerts/:id/acknowledge')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge a declining-performance alert — the sport\'s coach or Admin/Principal' })
  async acknowledgeAlert(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.snapshotService.acknowledgeAlert(id, staffId, this.isFullyPrivileged(req));
  }
}
