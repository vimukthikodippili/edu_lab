import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentNotesService } from './student-notes.service';
import { UpsertStudentYearEndNoteDto } from './dto/upsert-student-year-end-note.dto';

@ApiTags('Student Year-End Notes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'student-notes', version: '1' })
export class StudentNotesController {
  constructor(
    private readonly studentNotesService: StudentNotesService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new Error('User email not found');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new Error('Staff record not found for this user');
    return staff.id;
  }

  @Get(':studentId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher, RoleEnum.counselor, RoleEnum.school_psychologist)
  async getNotes(
    @Param('studentId') studentId: string,
    @Request() req: { user: { id: string; role: { id: number } } },
  ) {
    const isTeacher = String(req.user.role.id) === String(RoleEnum.teacher);
    const requesterStaffId = isTeacher ? await this.resolveStaffId(req.user.id) : null;
    return this.studentNotesService.getNotesForStudent(studentId, requesterStaffId);
  }

  @Put(':studentId')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  async upsertNote(
    @Param('studentId') studentId: string,
    @Body() dto: UpsertStudentYearEndNoteDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.studentNotesService.upsertNote(studentId, staffId, dto);
  }
}
