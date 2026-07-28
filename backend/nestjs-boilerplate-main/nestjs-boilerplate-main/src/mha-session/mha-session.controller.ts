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
import { MhaSessionService } from './mha-session.service';
import { MhaSessionStatus } from './entities/mha-session.entity';
import { CreateMhaSessionDto } from './dto/create-mha-session.dto';
import { PreviewMhaSessionDto } from './dto/preview-mha-session.dto';
import { MhaCaseloadService } from '../mha-caseload/mha-caseload.service';
import { QueryCaseloadDto } from '../mha-caseload/dto/query-caseload.dto';
import { MhaHistoryService } from '../mha-history/mha-history.service';

/** FR-MHA-02 — only Counselor/School Psychologist may initiate a session (preview or create).
 * Reading an existing session broadens to admin/principal, per FR-MHA-30. */
@ApiTags('MHA — Screening Sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mha-sessions', version: '1' })
export class MhaSessionController {
  constructor(
    private readonly sessionService: MhaSessionService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    private readonly caseloadService: MhaCaseloadService,
    private readonly historyService: MhaHistoryService,
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

  @Get('preview')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Age-filtered domain preview for a student, before a session is created" })
  async preview(@Query() query: PreviewMhaSessionDto) {
    return this.sessionService.previewDomains(query.studentId, query.screeningDate);
  }

  @Post()
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new MHA screening session — blocked by 409 if no guardian consent exists' })
  async create(
    @Body() dto: CreateMhaSessionDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const counselorStaffId = await this.resolveStaffId(req.user.id);
    return this.sessionService.createSession(dto, counselorStaffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List MHA sessions, optionally filtered by status/studentId — not scoped to the caller' })
  async findAll(@Query('status') status?: MhaSessionStatus, @Query('studentId') studentId?: string) {
    return this.sessionService.listSessions(status, studentId);
  }

  // FR-MHA-31 — declared before `:id` (mirrors `preview` above) so the static "caseload" segment
  // isn't swallowed by the `:id` wildcard route below.
  @Get('caseload')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Counselor caseload — one row per student with >=1 completed MHA session" })
  async caseload(@Query() query: QueryCaseloadDto) {
    return this.caseloadService.getCaseload(query);
  }

  // FR-MHA-27 — AC #81 restricts this to Counselor/SchoolPsychologist/Principal only, deliberately
  // excluding admin (unlike findAll/findOne/summary below, which do include admin).
  @Get('students/:studentId/history')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Full chronological MHA history for a student, with per-category trend vs the two most recent sessions" })
  async history(@Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string) {
    return this.historyService.getHistory(studentId);
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single MHA session' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.sessionService.getSessionById(id);
  }

  @Get(':id/summary')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a completed session\'s risk-category summary, top findings, and recommended actions' })
  async summary(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.sessionService.getSessionSummary(id);
  }

  @Patch(':id/complete')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a draft session — irreversible; blocked if zero domains assessed' })
  async complete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const counselorStaffId = await this.resolveStaffId(req.user.id);
    return this.sessionService.completeSession(id, counselorStaffId);
  }
}
