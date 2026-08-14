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
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { AssessmentService } from '../services/assessment.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { RequestAssessmentChangeDto } from '../dto/request-assessment-change.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Assessments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/assessments', version: '1' })
export class AssessmentController {
  constructor(
    private readonly assessmentService: AssessmentService,
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

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Post()
  @Roles(RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an assessment (enforces plan count limit)' })
  async create(
    @Body() dto: CreateAssessmentDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assessmentService.create(dto, staffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List assessments with optional filters' })
  async findAll(
    @Query('termId') termId?: string,
    @Query('classSectionId') classSectionId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('mine') mine?: string,
    @Request() req?: { user: { id: unknown } },
  ) {
    const createdByTeacherId =
      mine === 'true' ? await this.resolveStaffId(req!.user.id) : undefined;
    return this.assessmentService.findAll(
      termId ? Number(termId) : undefined,
      classSectionId ? Number(classSectionId) : undefined,
      subjectId,
      createdByTeacherId,
    );
  }

  @Post(':id/request-change')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask the assessment creator to reconsider its topic/mark allocation' })
  async requestChange(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RequestAssessmentChangeDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    await this.assessmentService.requestChange(id, dto, staffId, this.isPrivileged(req));
    return { success: true };
  }
}
