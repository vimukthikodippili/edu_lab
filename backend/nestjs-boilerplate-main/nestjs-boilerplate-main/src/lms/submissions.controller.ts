import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { SubmissionsService } from './submissions.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { SubmissionEntity } from './entities/submission.entity';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('LMS — Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lms/assignments/:assignmentId/submissions', version: '1' })
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  private async resolveStudent(userId: number): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return student;
  }

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
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit (or resubmit) homework for an assignment' })
  @ApiCreatedResponse({ type: SubmissionEntity })
  async submit(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @Request() req: { user: { id: number } },
  ): Promise<SubmissionEntity> {
    const student = await this.resolveStudent(req.user.id);
    return this.submissionsService.submit(assignmentId, student.id, student.classSectionId, dto);
  }

  @Get('me')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the caller's own submission for an assignment, if any" })
  @ApiOkResponse({ type: SubmissionEntity })
  async findMine(
    @Param('assignmentId') assignmentId: string,
    @Request() req: { user: { id: number } },
  ): Promise<SubmissionEntity | null> {
    const student = await this.resolveStudent(req.user.id);
    return this.submissionsService.findMineForAssignment(assignmentId, student.id);
  }

  @Patch(':submissionId/grade')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a grade and/or written feedback to a submission' })
  @ApiOkResponse({ type: SubmissionEntity })
  async grade(
    @Param('assignmentId') assignmentId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<SubmissionEntity> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.submissionsService.grade(
      submissionId,
      assignmentId,
      staffId,
      this.isPrivileged(req),
      dto,
    );
  }
}
