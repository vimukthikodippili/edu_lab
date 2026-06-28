import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
