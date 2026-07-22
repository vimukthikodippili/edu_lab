import {
  Body,
  Controller,
  ForbiddenException,
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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { LabReportAssignmentService } from './lab-report-assignment.service';
import { LabReportSubmissionService } from './lab-report-submission.service';
import { CreateLabReportAssignmentDto } from './dto/create-lab-report-assignment.dto';
import { SubmitLabReportDto } from './dto/submit-lab-report.dto';
import { GradeLabReportSubmissionDto } from './dto/grade-lab-report-submission.dto';

const MANAGEMENT_ROLES = new Set<number>([RoleEnum.admin, RoleEnum.principal]);

@ApiTags('Lab Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lab-reports', version: '1' })
export class LabReportsController {
  constructor(
    private readonly assignmentService: LabReportAssignmentService,
    private readonly submissionService: LabReportSubmissionService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && MANAGEMENT_ROLES.has(roleId);
  }

  private async resolveStudent(userId: number): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException('Your account is not yet linked to a student record — contact your school administrator.');
    }
    return student;
  }

  // ── Teacher: create + roster + grade ───────────────────────────────────────

  @Post('experiment-logs/:experimentLogId/assignments')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a lab report for an experiment session — auto-notifies every enrolled student' })
  async createAssignment(
    @Param('experimentLogId', new ParseUUIDPipe({ version: '4' })) experimentLogId: string,
    @Body() dto: CreateLabReportAssignmentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assignmentService.create(experimentLogId, dto, staffId, this.isPrivileged(req));
  }

  @Get('assignments/:assignmentId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single lab report assignment (title, instructions, due date, marking scheme)' })
  async getAssignment(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' })) assignmentId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assignmentService.findAssignmentWithOwnership(assignmentId, staffId, this.isPrivileged(req));
  }

  @Get('assignments/:assignmentId/roster')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Per-student submission status roster for an assignment' })
  async getRoster(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' })) assignmentId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assignmentService.findRoster(assignmentId, staffId, this.isPrivileged(req));
  }

  @Patch('assignments/:assignmentId/submissions/:submissionId/grade')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grade a submission with feedback — notifies the student and their guardians' })
  async gradeSubmission(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' })) assignmentId: string,
    @Param('submissionId', new ParseUUIDPipe({ version: '4' })) submissionId: string,
    @Body() dto: GradeLabReportSubmissionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.submissionService.grade(assignmentId, submissionId, dto, staffId, this.isPrivileged(req));
  }

  // ── Student: own assignments + submission ──────────────────────────────────

  @Get('my-class')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Lab report assignments for the caller's own class section" })
  async findMyClassAssignments(@Request() req: { user: { id: number } }) {
    const student = await this.resolveStudent(req.user.id);
    return this.assignmentService.findForClassSectionWithStudentStatus(student.classSectionId, student.id);
  }

  @Post('assignments/:assignmentId/submissions')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit (or resubmit, before grading) a lab report' })
  async submit(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' })) assignmentId: string,
    @Body() dto: SubmitLabReportDto,
    @Request() req: { user: { id: number } },
  ) {
    const student = await this.resolveStudent(req.user.id);
    return this.submissionService.submit(assignmentId, student.id, student.classSectionId, dto);
  }

  @Get('assignments/:assignmentId/submissions/me')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The caller's own submission for an assignment, if any" })
  async findMine(
    @Param('assignmentId', new ParseUUIDPipe({ version: '4' })) assignmentId: string,
    @Request() req: { user: { id: number } },
  ) {
    const student = await this.resolveStudent(req.user.id);
    return this.submissionService.findMine(assignmentId, student.id, student.classSectionId);
  }

  // ── Guardian: linked child's assignments ────────────────────────────────────

  @Get('guardian/:studentId/assignments')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a linked child's lab report assignments" })
  async findForGuardianChild(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardian = await this.guardianRepo.findOne({ where: { userId: req.user.id as number } });
    if (!guardian) {
      throw new NotFoundException('Your account is not yet linked to a guardian record — contact your school administrator.');
    }
    const links = await this.sgRepo.find({ where: { guardianId: guardian.id } });
    if (!links.some((l) => l.studentId === studentId)) {
      throw new ForbiddenException('You are not authorized to view assignments for this student.');
    }
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found.');

    return this.assignmentService.findForClassSectionWithStudentStatus(student.classSectionId, student.id);
  }
}
