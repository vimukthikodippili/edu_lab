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
import { ExamInvigilatorService } from './exam-invigilator.service';
import { AssignInvigilatorsDto } from './dto/assign-invigilators.dto';

const FULLY_PRIVILEGED_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);
const SECTION_HEAD_ROLE = RoleEnum.section_head;

/** P5-EH-2 — FR-P5-EH-10/11/15. Mirrors `ExamController`'s exact fully-privileged/section-head
 * role resolution helpers. `dayDashboard` is deliberately narrower than every other route here
 * (`admin`/`principal` only, no `section_head`) — matches the AC's own literal "Principal/
 * ExamAdmin only" wording, a real scope distinction, not an inconsistency. */
@ApiTags('Exam Halls — Invigilators')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'exams', version: '1' })
export class ExamInvigilatorController {
  constructor(
    private readonly invigilatorService: ExamInvigilatorService,
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

  @Post(':examId/halls/:examHallId/invigilators')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign one or more staff as invigilators for this hall' })
  async assign(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Param('examHallId', new ParseUUIDPipe({ version: '4' })) examHallId: string,
    @Body() dto: AssignInvigilatorsDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.invigilatorService.assignInvigilators(
      examId,
      examHallId,
      dto,
      staffId,
      this.isFullyPrivileged(req),
      this.isSectionHead(req),
    );
  }

  @Get(':examId/invigilators')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List every invigilator assignment for this exam' })
  async list(@Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string) {
    return this.invigilatorService.listInvigilators(examId);
  }

  @Get(':examId/day-dashboard')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exam-day oversight: every hall used, invigilators, headcount, and times' })
  async dayDashboard(@Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string) {
    return this.invigilatorService.getDayDashboard(examId);
  }
}
