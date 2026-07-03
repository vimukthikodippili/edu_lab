import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { TermAssessmentPlanService } from '../services/term-assessment-plan.service';
import { CreateTermAssessmentPlanDto } from '../dto/create-term-assessment-plan.dto';
import { UpdateTermAssessmentPlanDto } from '../dto/update-term-assessment-plan.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

@ApiTags('Grades — Assessment Plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/assessment-plans', version: '1' })
export class TermAssessmentPlanController {
  constructor(
    private readonly planService: TermAssessmentPlanService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException(
        'No staff record linked to your account.',
      );
    return staff.id;
  }

  @Post()
  @Roles(RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a term assessment plan (section head only)' })
  async create(
    @Body() dto: CreateTermAssessmentPlanDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.planService.create(dto, staffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List assessment plans, optionally filtered by termId' })
  findAll(@Query('termId') termId?: string) {
    return this.planService.findAll(termId ? Number(termId) : undefined);
  }

  @Get('my-subjects')
  @Roles(RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get assessment plan summary per subject the teacher teaches" })
  async mySubjects(
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.planService.findMySubjectPlans(staffId, Number(termId));
  }

  @Patch(':id')
  @Roles(RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update required assessment count (section head only)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTermAssessmentPlanDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.planService.update(id, dto, staffId);
  }

  @Delete(':id')
  @Roles(RoleEnum.section_head)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete assessment plan (section head only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.planService.remove(id);
  }
}
