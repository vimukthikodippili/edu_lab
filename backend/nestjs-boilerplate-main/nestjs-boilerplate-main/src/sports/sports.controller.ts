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
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';

/** Used only for roster mutations (enrollStudent/removeFromRoster) and sport management
 * (create/update) — deliberately unchanged by the Section-Head grade-range hardening below,
 * since that hardening is scoped to *visibility* only, not roster mutation rights. */
const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.admin,
  RoleEnum.principal,
  RoleEnum.section_head,
]);

/** Match creation/edit is Coach-or-(Admin/Principal) only — deliberately excludes Section Head,
 * unlike PRIVILEGED_ROLES above which governs sport management and roster/view access. */
const MATCH_MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

/** FR-P3-AV-02: Section Head is deliberately NOT in this set — a Section Head's view access is
 * now grade-range-scoped (see isViewAuthorized below), not an unconditional bypass. Only
 * admin/principal see everything, unrestricted. */
const FULLY_PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

const SECTION_HEAD_ROLE = RoleEnum.section_head;

@ApiTags('Sports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'sports', version: '1' })
export class SportsController {
  constructor(
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

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
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

  /** FR-P3-AV-02/03: replaces the old sync isPrivileged() check for single-sport VIEW routes
   * (roster/matches/training-sessions). Admin/Principal are unrestricted; a Section Head is
   * authorized only if this specific sport has an enrolled student in their configured grade
   * range (checked live per request, not just filtered out of the list view); anyone else
   * (including a non-coaching Teacher) resolves to false here — coach-ownership itself is still
   * checked inside the service's own assertAuthorized, unchanged. */
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

  @Get('directory')
  @Roles(RoleEnum.principal, RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Principal-facing directory of all sports, their coach, and roster size',
  })
  async getDirectory() {
    return this.sportsService.getDirectory();
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all sports — filtered to a Section Head\'s configured grade range',
  })
  async findAll(@Request() req: { user: { id: unknown; role?: { id?: number } } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.findAll(
      staffId,
      this.isFullyPrivileged(req),
      this.isSectionHead(req),
    );
  }

  @Get('my-coached')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List the sport(s) the caller is the assigned coach for' })
  async findMyCoached(@Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.findByCoach(staffId);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a sport and assign its coach' })
  async create(@Body() dto: CreateSportDto) {
    return this.sportsService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a sport, including reassigning its coach' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSportDto,
  ) {
    return this.sportsService.update(id, dto);
  }

  @Get(':id/roster')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a sport's roster — the assigned coach or a privileged role" })
  async getRoster(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.getRoster(id, staffId, await this.isViewAuthorized(id, req));
  }

  @Post(':id/roster')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll a student into a sport team' })
  async enrollStudent(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: EnrollStudentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.enrollStudent(id, dto, staffId, this.isPrivileged(req));
  }

  @Delete(':id/roster/:studentId')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a student from a sport team' })
  async removeFromRoster(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    await this.sportsService.removeFromRoster(id, studentId, staffId, this.isPrivileged(req));
  }

  @Get(':id/matches')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Match history for a sport — the assigned coach, Section Head, or a privileged role' })
  async findMatches(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.findMatches(id, staffId, await this.isViewAuthorized(id, req));
  }

  @Post(':id/matches')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a match/event for a sport — the assigned coach or Admin/Principal' })
  async createMatch(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateMatchDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.createMatch(id, dto, staffId, this.isMatchManagementPrivileged(req));
  }

  @Patch(':id/matches/:matchId')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a logged match — the assigned coach or Admin/Principal' })
  async updateMatch(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Body() dto: UpdateMatchDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.updateMatch(
      matchId,
      dto,
      staffId,
      this.isMatchManagementPrivileged(req),
    );
  }

  @Get(':id/training-sessions')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Training session history for a sport' })
  async findTrainingSessions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.findTrainingSessions(
      id,
      staffId,
      await this.isViewAuthorized(id, req),
    );
  }

  @Post(':id/training-sessions')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a training session for a sport — the assigned coach or Admin/Principal' })
  async createTrainingSession(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateTrainingSessionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.createTrainingSession(
      id,
      dto,
      staffId,
      this.isMatchManagementPrivileged(req),
    );
  }

  @Patch(':id/training-sessions/:sessionId')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a logged training session — the assigned coach or Admin/Principal' })
  async updateTrainingSession(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Body() dto: UpdateTrainingSessionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.sportsService.updateTrainingSession(
      sessionId,
      dto,
      staffId,
      this.isMatchManagementPrivileged(req),
    );
  }
}
