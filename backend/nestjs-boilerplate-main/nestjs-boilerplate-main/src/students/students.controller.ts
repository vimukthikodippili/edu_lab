import {
  Body,
  Controller,
  Delete,
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { AssignClassTeacherDto } from './dto/assign-class-teacher.dto';
import { TransferSectionDto } from './dto/transfer-section.dto';
import { MarkAsLeavingDto } from './dto/mark-as-leaving.dto';
import { LinkUserAccountDto } from './dto/link-user-account.dto';
import { PreviewPromotionQueryDto } from './dto/preview-promotion.dto';
import { CommitPromotionDto } from './dto/commit-promotion.dto';
import { StudentEntity } from './entities/student.entity';
import { GradeEntity } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { StudentPromotionService } from './services/student-promotion.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Students')
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    private readonly studentPromotionService: StudentPromotionService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new Error('User email not found');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new Error('Staff record not found for this user');
    return staff.id;
  }

  // ─── Enrollment ────────────────────────────────────────────────────

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll a new student (admin / principal only)' })
  @ApiCreatedResponse({ type: StudentEntity })
  enroll(@Body() dto: CreateStudentDto): Promise<StudentEntity> {
    return this.studentsService.enroll(dto);
  }

  // ─── Listing & Search ──────────────────────────────────────────────

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List students with pagination and filters' })
  findMany(@Query() query: QueryStudentDto) {
    return this.studentsService.findMany(query);
  }

  @Get('grades')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.accountant,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all grades (used to populate Grade dropdown in enrollment form)' })
  @ApiOkResponse({ type: [GradeEntity] })
  findAllGrades(): Promise<GradeEntity[]> {
    return this.studentsService.findAllGrades();
  }

  @Post('class-sections')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new class section for a grade and academic year' })
  @ApiCreatedResponse({ type: ClassSectionEntity })
  createClassSection(@Body() dto: CreateClassSectionDto): Promise<ClassSectionEntity> {
    return this.studentsService.createClassSection(dto);
  }

  @Get('class-sections')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all class sections with optional grade/year filters' })
  @ApiOkResponse({ type: [ClassSectionEntity] })
  findAllClassSections(
    @Query('gradeId') gradeId?: string,
    @Query('academicYear') academicYear?: string,
  ): Promise<ClassSectionEntity[]> {
    return this.studentsService.findAllClassSections(
      gradeId ? Number(gradeId) : undefined,
      academicYear,
    );
  }

  @Get('class-sections/my-class-teacher-section')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the class section(s) where the caller is the assigned class teacher" })
  @ApiOkResponse({ type: [ClassSectionEntity] })
  async findMyClassTeacherSections(
    @Request() req: { user: { id: string } },
  ): Promise<ClassSectionEntity[]> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.studentsService.findMyClassTeacherSections(staffId);
  }

  @Patch('class-sections/:id/class-teacher')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign (or clear) the class teacher for a class section' })
  @ApiOkResponse({ type: ClassSectionEntity })
  assignClassTeacher(
    @Param('id') id: string,
    @Body() dto: AssignClassTeacherDto,
  ): Promise<ClassSectionEntity> {
    return this.studentsService.assignClassTeacher(Number(id), dto);
  }

  @Get('grades/:gradeId/sections')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List class sections for a grade (cascades from Grade dropdown)' })
  @ApiOkResponse({ type: [ClassSectionEntity] })
  findClassSections(
    @Param('gradeId') gradeId: string,
    @Query('academicYear') academicYear?: string,
  ): Promise<ClassSectionEntity[]> {
    return this.studentsService.findClassSections(Number(gradeId), academicYear);
  }

  // ─── Annual Promotion ──────────────────────────────────────────────

  @Get('promote-year/preview')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview the outcome of promoting every active student from one academic year to the next' })
  previewPromotion(@Query() query: PreviewPromotionQueryDto) {
    return this.studentPromotionService.preview(query);
  }

  @Post('promote-year/commit')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit an (admin-reviewed) promotion outcome for a batch of students' })
  commitPromotion(@Body() dto: CommitPromotionDto) {
    return this.studentPromotionService.commit(dto);
  }

  @Patch(':id/transfer-section')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Move a student to a different class section within their current grade and academic year" })
  @ApiOkResponse({ type: StudentEntity })
  transferSection(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: TransferSectionDto,
  ): Promise<StudentEntity> {
    return this.studentsService.transferSection(id, dto);
  }

  // ─── Self-Service (must be registered before the ':id' wildcard route) ──

  @Get('me')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the student record for the currently authenticated user" })
  @ApiOkResponse({ type: StudentEntity })
  async me(@Request() req: { user: { id: number } }): Promise<StudentEntity> {
    const student = await this.studentsService.findByUserId(req.user.id);
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return student;
  }

  @Get('guardians/me')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the guardian record and linked children for the currently authenticated user" })
  async guardiansMe(@Request() req: { user: { id: number } }) {
    const guardian = await this.studentsService.findGuardianByUserId(req.user.id);
    if (!guardian) {
      throw new NotFoundException(
        'Your account is not yet linked to a guardian record — contact your school administrator.',
      );
    }
    const students = await this.studentsService.findStudentsForGuardian(guardian.id);
    return { guardian, students };
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get student by UUID' })
  @ApiOkResponse({ type: StudentEntity })
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<StudentEntity> {
    return this.studentsService.findById(id);
  }

  @Get('admission/:admissionNumber')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher, RoleEnum.security_officer)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get student by admission number (QR scanner endpoint)' })
  @ApiOkResponse({ type: StudentEntity })
  findByAdmissionNumber(@Param('admissionNumber') admissionNumber: string): Promise<StudentEntity> {
    return this.studentsService.findByAdmissionNumber(admissionNumber);
  }

  @Patch(':id/leave')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a student as graduated or transferred (leaving the school)' })
  @ApiOkResponse({ type: StudentEntity })
  markAsLeaving(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: MarkAsLeavingDto,
  ): Promise<StudentEntity> {
    return this.studentsService.markAsLeaving(id, dto);
  }

  @Patch(':id/link-user')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Link (or clear) this student's portal login account by email" })
  @ApiOkResponse({ type: StudentEntity })
  linkUserAccount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: LinkUserAccountDto,
  ): Promise<StudentEntity> {
    return this.studentsService.linkUserAccount(id, dto);
  }

  // ─── Guardian Management ──────────────────────────────────────────

  @Post(':id/guardians')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a guardian to an enrolled student (max 5)' })
  @ApiOkResponse({ type: StudentEntity })
  addGuardian(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AddGuardianDto,
  ): Promise<StudentEntity> {
    return this.studentsService.addGuardian(id, dto);
  }

  @Patch(':id/guardians/:guardianId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a guardian linked to a student' })
  @ApiOkResponse({ type: StudentEntity })
  updateGuardian(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('guardianId', new ParseUUIDPipe({ version: '4' })) guardianId: string,
    @Body() dto: UpdateGuardianDto,
  ): Promise<StudentEntity> {
    return this.studentsService.updateGuardian(id, guardianId, dto);
  }

  @Delete(':id/guardians/:guardianId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a guardian from a student (cannot remove the primary contact or the last guardian)' })
  @ApiOkResponse({ type: StudentEntity })
  removeGuardian(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('guardianId', new ParseUUIDPipe({ version: '4' })) guardianId: string,
  ): Promise<StudentEntity> {
    return this.studentsService.removeGuardian(id, guardianId);
  }

  @Patch(':id/guardians/:guardianId/primary')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Designate a guardian as the primary contact (clears the previous primary)' })
  @ApiOkResponse({ type: StudentEntity })
  setPrimaryContact(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('guardianId', new ParseUUIDPipe({ version: '4' })) guardianId: string,
  ): Promise<StudentEntity> {
    return this.studentsService.setPrimaryContact(id, guardianId);
  }

  @Patch(':id/guardians/:guardianId/link-user')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Link (or clear) a guardian's portal login account by email" })
  linkGuardianUserAccount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('guardianId', new ParseUUIDPipe({ version: '4' })) guardianId: string,
    @Body() dto: LinkUserAccountDto,
  ) {
    return this.studentsService.linkGuardianUserAccount(id, guardianId, dto);
  }

  // ─── Withdrawal (soft delete) ──────────────────────────────────────

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw a student (soft delete, preserves record)' })
  @ApiNoContentResponse()
  withdraw(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    return this.studentsService.withdraw(id);
  }
}
