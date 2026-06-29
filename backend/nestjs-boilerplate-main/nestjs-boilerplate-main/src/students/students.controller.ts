import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { CreateClassSectionDto } from './dto/create-class-section.dto';
import { StudentEntity } from './entities/student.entity';
import { GradeEntity } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Students')
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

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
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
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
