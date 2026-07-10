import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
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
import { ResultsQueryService } from '../services/results-query.service';
import { ResultPublishingService } from '../services/result-publishing.service';
import { PublishResultsDto } from '../dto/publish-results.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';
import { StudentEntity } from '../../students/entities/student.entity';
import { GuardianEntity } from '../../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../../students/entities/student-guardian.entity';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Results')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/results', version: '1' })
export class ResultsController {
  constructor(
    private readonly resultsQueryService: ResultsQueryService,
    private readonly resultPublishingService: ResultPublishingService,
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

  /**
   * Resolves which studentId the caller is actually allowed to view published
   * results for — never trusts the client-supplied `studentId` query param.
   * A student caller is always resolved to their own record, regardless of
   * what was requested. A guardian caller must be requesting one of their
   * own linked children, or is rejected with a 403.
   */
  private async assertCanViewPublishedResults(
    req: { user: { id: unknown; role?: { id?: number } } },
    requestedStudentId: string,
  ): Promise<string> {
    const roleId = req.user.role?.id;

    if (String(roleId) === String(RoleEnum.student)) {
      const student = await this.studentRepo.findOne({
        where: { userId: req.user.id as number },
      });
      if (!student) {
        throw new NotFoundException(
          'Your account is not yet linked to a student record — contact your school administrator.',
        );
      }
      return student.id;
    }

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
    if (!allowedStudentIds.includes(requestedStudentId)) {
      throw new ForbiddenException(
        'You are not authorized to view results for this student.',
      );
    }
    return requestedStudentId;
  }

  @Get('subject')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a student's computed result for one subject" })
  async getSubjectResult(
    @Query('studentId') studentId: string,
    @Query('subjectId') subjectId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getSubjectResult(
      studentId,
      subjectId,
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('term')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a student's computed result for a term" })
  async getTermResult(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getTermResult(
      studentId,
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('class')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the ranked class results for a term' })
  async getClassResults(
    @Query('classSectionId') classSectionId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.resultsQueryService.getClassResults(
      Number(classSectionId),
      Number(termId),
      staffId,
      this.isPrivileged(req),
    );
  }

  @Get('published')
  @Roles(RoleEnum.student, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a student's published term result — student/guardian portal only",
  })
  async getPublishedTermResult(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const resolvedStudentId = await this.assertCanViewPublishedResults(req, studentId);
    const result =
      await this.resultPublishingService.getPublishedTermResultForStudent(
        resolvedStudentId,
        Number(termId),
      );
    if (!result) {
      throw new NotFoundException(
        'No published result found for the given student and term.',
      );
    }
    return result;
  }

  @Get('published/subjects')
  @Roles(RoleEnum.student, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a student's published subject results — student/guardian portal only",
  })
  async getPublishedSubjectResults(
    @Query('studentId') studentId: string,
    @Query('termId') termId: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const resolvedStudentId = await this.assertCanViewPublishedResults(req, studentId);
    return this.resultPublishingService.getPublishedSubjectResultsForStudent(
      resolvedStudentId,
      Number(termId),
    );
  }

  @Post('publish')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publish all complete term results for a class section and term (Principal/Exam Admin only)',
  })
  async publishResults(@Body() dto: PublishResultsDto) {
    return this.resultPublishingService.publishClassResults(
      dto.classSectionId,
      dto.termId,
    );
  }
}
