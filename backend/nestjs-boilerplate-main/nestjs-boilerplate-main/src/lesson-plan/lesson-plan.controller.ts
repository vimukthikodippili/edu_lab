import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
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
import { LessonPlanService } from './lesson-plan.service';
import { UpsertLessonPlanEntryDto } from './dto/upsert-lesson-plan-entry.dto';
import { SubmitLessonPlanDto } from './dto/submit-lesson-plan.dto';
import { QueryLessonPlanDto } from './dto/query-lesson-plan.dto';
import { MarkCompleteLessonPlanEntryDto } from './dto/mark-complete-lesson-plan-entry.dto';
import { SectionSummaryQueryDto } from './dto/section-summary-query.dto';
import { QueryMonthlyPlanDto } from './dto/query-monthly-plan.dto';
import { MonthEndSummaryQueryDto } from './dto/month-end-summary-query.dto';

@ApiTags('Lesson Plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lesson-plans', version: '1' })
export class LessonPlanController {
  constructor(
    private readonly lessonPlanService: LessonPlanService,
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

  @Get()
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
  )
  async findEntries(
    @Query() query: QueryLessonPlanDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.findEntries(staffId, query);
  }

  @Get('status')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
  )
  async getStatus(
    @Query() query: QueryLessonPlanDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.getStatus(
      staffId,
      query.subjectId ?? '',
      query.gradeId ?? 0,
      query.academicYear ?? '',
    );
  }

  @Get('section-summary')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async getSectionSummary(@Query() query: SectionSummaryQueryDto) {
    return this.lessonPlanService.getSectionSummary(query);
  }

  @Get('month-end-summary')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async getMonthEndSummaries(@Query() query: MonthEndSummaryQueryDto) {
    return this.lessonPlanService.getMonthEndSummaries(query);
  }

  @Get('monthly')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
  )
  async getMonthlyPlan(
    @Query() query: QueryMonthlyPlanDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.getMonthlyPlan(staffId, query);
  }

  @Put('entry')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  async upsertEntry(
    @Body() dto: UpsertLessonPlanEntryDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.upsertEntry(staffId, dto);
  }

  @Patch('entry/complete')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  async markComplete(
    @Body() dto: MarkCompleteLessonPlanEntryDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.markComplete(staffId, dto);
  }

  @Post('submit')
  @Roles(RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Body() dto: SubmitLessonPlanDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lessonPlanService.submit(staffId, dto);
  }
}
