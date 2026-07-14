import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { AssignmentsService } from './assignments.service';
import { SubmissionsService, SubmissionStatus } from './submissions.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { AssignmentEntity } from './entities/assignment.entity';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('LMS — Assignments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lms/assignments', version: '1' })
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly submissionsService: SubmissionsService,
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
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a homework assignment for a class section + subject' })
  @ApiCreatedResponse({ type: AssignmentEntity })
  async create(
    @Body() dto: CreateAssignmentDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<AssignmentEntity> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assignmentsService.create(dto, staffId, this.isPrivileged(req));
  }

  @Get('my-class')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List homework assignments for the caller's own class section" })
  @ApiOkResponse({ type: [AssignmentEntity] })
  async findForMyClass(
    @Request() req: { user: { id: number } },
  ): Promise<AssignmentEntity[]> {
    const student = await this.studentRepo.findOne({ where: { userId: req.user.id } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return this.assignmentsService.findForClassSection(student.classSectionId);
  }

  @Get('submissions/statuses')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List submission status (submitted/not_submitted) for every assignment in the caller's own class section" })
  async findSubmissionStatuses(
    @Request() req: { user: { id: number } },
  ): Promise<SubmissionStatus[]> {
    const student = await this.studentRepo.findOne({ where: { userId: req.user.id } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return this.submissionsService.getStatusesForStudent(student.classSectionId, student.id);
  }

  @Get('mine')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List homework assignments created by the caller' })
  @ApiOkResponse({ type: [AssignmentEntity] })
  async findMine(
    @Request() req: { user: { id: unknown } },
  ): Promise<AssignmentEntity[]> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.assignmentsService.findMine(staffId);
  }

  @Get('guardian/:studentId')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a linked child's assignments with status and grade" })
  async findForGuardianChild(
    @Param('studentId') studentId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardian = await this.guardianRepo.findOne({
      where: { userId: req.user.id as number },
    });
    if (!guardian) {
      throw new NotFoundException(
        'Your account is not yet linked to a guardian record — contact your school administrator.',
      );
    }
    const links = await this.sgRepo.find({ where: { guardianId: guardian.id } });
    const allowedStudentIds = links.map((l) => l.studentId);
    if (!allowedStudentIds.includes(studentId)) {
      throw new ForbiddenException(
        'You are not authorized to view assignments for this student.',
      );
    }

    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found.');
    }

    return this.submissionsService.getForGuardianChild(studentId, student.classSectionId);
  }

  @Get(':assignmentId/roster')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the submission roster (per-student status) for an assignment' })
  async getRoster(
    @Param('assignmentId') assignmentId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.submissionsService.getRosterForAssignment(
      assignmentId,
      staffId,
      this.isPrivileged(req),
    );
  }
}
