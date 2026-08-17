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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { StudentsService } from '../students/students.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { SubjectSelectionService } from './subject-selection.service';
import { SubmitSubjectSelectionDto } from './dto/submit-subject-selection.dto';
import { DecideSubjectSelectionDto } from './dto/decide-subject-selection.dto';
import { SubjectSelectionStatus } from './entities/subject-selection-request.entity';

@ApiTags('Subject Selection')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ version: '1' })
export class SubjectSelectionController {
  constructor(
    private readonly svc: SubjectSelectionService,
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStudentId(userId: number): Promise<string> {
    const student = await this.studentsService.findByUserId(userId);
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return student.id;
  }

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new NotFoundException('User email not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new NotFoundException('Staff record not found for this user.');
    return staff.id;
  }

  // ─────────────────────── Student self-service ─────────────────────────────

  @Get('students/me/subject-selection')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Core/optional/stream subjects available to the logged-in student, plus any existing request' })
  async getAvailable(@Request() req: { user: { id: number } }) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.svc.getAvailableSubjects(studentId);
  }

  @Post('students/me/subject-selection')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a subject selection request for the currently-open window' })
  async submit(
    @Body() dto: SubmitSubjectSelectionDto,
    @Request() req: { user: { id: number } },
  ) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.svc.submitRequest(studentId, dto);
  }

  // ─────────────────────── Admin/Principal review ────────────────────────────

  @Get('enrollments/subject-selection-requests')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  findPending(@Query('gradeStageId') gradeStageId?: string) {
    return this.svc.findPending(gradeStageId);
  }

  @Post('enrollments/subject-selection-requests/:id/approve')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DecideSubjectSelectionDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.svc.decide(id, SubjectSelectionStatus.APPROVED, staffId, dto.reviewNote);
  }

  @Post('enrollments/subject-selection-requests/:id/reject')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DecideSubjectSelectionDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.svc.decide(id, SubjectSelectionStatus.REJECTED, staffId, dto.reviewNote);
  }
}
