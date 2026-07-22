import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { PerformanceService } from './performance.service';
import { SportsService } from './sports.service';
import { BulkUpsertPerformanceDto } from './dto/bulk-upsert-performance.dto';

/** Same narrower set as match management — entering performance is a coach action, and
 * Section Head is deliberately excluded, mirroring SportsController's own asymmetry. */
const MATCH_MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

/** FR-P3-AV-02: Section Head is deliberately NOT here — view access is grade-range-scoped (see
 * isViewAuthorized below), not an unconditional bypass. Mirrors SportsController's own split. */
const FULLY_PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

const SECTION_HEAD_ROLE = RoleEnum.section_head;

@ApiTags('Sports Performance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'sports', version: '1' })
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
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

  private isMatchManagementPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && MATCH_MANAGEMENT_ROLES.has(roleId);
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

  @Get(':id/matches/:matchId/performance')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Performance entry grid for a match — roster x this sport\'s fixed metrics' })
  async findEntryGrid(
    @Param('id', new ParseUUIDPipe({ version: '4' })) sportId: string,
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.performanceService.findEntryGrid(
      sportId,
      matchId,
      staffId,
      await this.isViewAuthorized(sportId, req),
    );
  }

  @Post(':id/matches/:matchId/performance')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk save/submit per-student performance for a match' })
  async bulkUpsert(
    @Param('id', new ParseUUIDPipe({ version: '4' })) sportId: string,
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Body() dto: BulkUpsertPerformanceDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.performanceService.bulkUpsertPerformance(
      sportId,
      matchId,
      dto,
      staffId,
      this.isMatchManagementPrivileged(req),
    );
  }

  @Patch(':id/matches/:matchId/performance/:performanceId/override')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant a one-time edit override past the 48-hour window — Admin/Principal only' })
  async grantOverride(
    @Param('performanceId', new ParseUUIDPipe({ version: '4' })) performanceId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.performanceService.grantOverride(performanceId, staffId);
  }
}
