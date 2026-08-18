import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { PerformanceTrendService } from '../services/performance-trend.service';
import { ComputeTopicSnapshotsDto } from '../dto/compute-topic-snapshots.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';
import { StudentEntity } from '../../students/entities/student.entity';
import { GuardianEntity } from '../../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../../students/entities/student-guardian.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Performance Trends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades', version: '1' })
export class PerformanceTrendController {
  constructor(
    private readonly performanceTrendService: PerformanceTrendService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,
    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
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
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  /** For a guardian, mirrors ResultsController.assertCanViewPublishedResults exactly: must be
   * requesting one of their own linked children. For a student, this endpoint is stricter than
   * that precedent (which silently substitutes the caller's own id no matter what was
   * requested) — here, requesting a DIFFERENT student's id is a real 403, not a silent
   * redirect to self, since "can a student see another student's trend" is an explicit,
   * separately-tested requirement for this endpoint. */
  private async resolveSelfOrLinkedStudentId(
    req: { user: { id: unknown; role?: { id?: number } } },
    requestedStudentId: string,
  ): Promise<string> {
    const roleId = req.user.role?.id;

    if (String(roleId) === String(RoleEnum.student)) {
      const student = await this.studentRepo.findOne({ where: { userId: req.user.id as number } });
      if (!student) {
        throw new NotFoundException(
          'Your account is not yet linked to a student record — contact your school administrator.',
        );
      }
      if (student.id !== requestedStudentId) {
        throw new ForbiddenException("You are not authorized to view another student's performance trend.");
      }
      return student.id;
    }

    if (String(roleId) === String(RoleEnum.guardian)) {
      const guardian = await this.guardianRepo.findOne({ where: { userId: req.user.id as number } });
      if (!guardian) {
        throw new NotFoundException(
          'Your account is not yet linked to a guardian record — contact your school administrator.',
        );
      }
      const links = await this.sgRepo.find({ where: { guardianId: guardian.id } });
      const allowedStudentIds = links.map((l) => l.studentId);
      if (!allowedStudentIds.includes(requestedStudentId)) {
        throw new ForbiddenException('You are not authorized to view this student.');
      }
      return requestedStudentId;
    }

    return requestedStudentId;
  }

  @Get('students/:studentId/performance-trend')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.student,
    RoleEnum.guardian,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Multi-year, multi-term subject and topic performance trend for one student' })
  async getPerformanceTrend(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Query('subjectId') subjectId: string | undefined,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const roleId = req.user.role?.id;
    const resolvedStudentId = await this.resolveSelfOrLinkedStudentId(req, studentId);

    if (String(roleId) === String(RoleEnum.teacher)) {
      const staffId = await this.resolveStaffId(req.user.id);
      if (subjectId) {
        const rows = await this.subjectResultRepo.find({
          where: { studentId: resolvedStudentId, subjectId },
        });
        const everTaught = await this.performanceTrendService.teacherEverTaught(staffId, subjectId, rows);
        if (!everTaught) {
          throw new ForbiddenException('You have never taught this student this subject.');
        }
        return this.performanceTrendService.getPerformanceTrend(resolvedStudentId, subjectId);
      }
      return this.performanceTrendService.getPerformanceTrend(resolvedStudentId, undefined, staffId);
    }

    return this.performanceTrendService.getPerformanceTrend(resolvedStudentId, subjectId);
  }

  @Post('admin/compute-topic-snapshots')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually (re)compute topic-term snapshots for a term' })
  async computeTopicSnapshots(@Body() dto: ComputeTopicSnapshotsDto) {
    const count = await this.performanceTrendService.computeTopicSnapshotsForTerm(dto.termId);
    return { termId: dto.termId, snapshotsComputed: count };
  }

  @Get('class-sections/:classSectionId/subject-trend')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Students x terms performance grid for one class section + subject' })
  async getClassSubjectTrendGrid(
    @Param('classSectionId') classSectionId: string,
    @Query('subjectId') subjectId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    if (!this.isPrivileged(req)) {
      const staffId = await this.resolveStaffId(req.user.id);
      const count = await this.requirementRepo.count({
        where: { teacherId: staffId, subjectId, classSectionId: Number(classSectionId) },
      });
      if (count === 0) {
        throw new ForbiddenException('You are not assigned to teach this subject for this class section.');
      }
    }
    return this.performanceTrendService.getClassSubjectTrendGrid(Number(classSectionId), subjectId);
  }

  @Get('analytics/subject-year-trends')
  @Roles(RoleEnum.principal, RoleEnum.section_head, RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'School-wide per-subject, per-year performance trends' })
  async getSchoolSubjectYearTrends() {
    return this.performanceTrendService.getSchoolSubjectYearTrends();
  }
}
