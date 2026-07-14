import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { CounselorNoteService } from './counselor-note.service';
import { CreateCounselorNoteDto } from './dto/create-counselor-note.dto';
import { SetApprovedSummaryDto } from './dto/set-approved-summary.dto';

@ApiTags('Counselor Notes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'counselor-notes', version: '1' })
export class CounselorNotesController {
  constructor(
    private readonly noteService: CounselorNoteService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepo: Repository<StudentGuardianEntity>,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new NotFoundException('No staff record linked to your account.');
    return staff.id;
  }

  @Post()
  @Roles(RoleEnum.counselor)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a confidential counselor session note (FR-WB-04) — encrypted at rest' })
  async create(
    @Body() dto: CreateCounselorNoteDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const counselorStaffId = await this.resolveStaffId(req.user.id);
    return this.noteService.create(dto.studentId, counselorStaffId, dto.notes, dto.caseId ?? null);
  }

  // Deliberately excludes teacher/student/guardian — counseling notes are restricted to
  // Principal/Counselor only (FR-WB-10), decrypted here for the first time since storage.
  @Get('student/:studentId')
  @Roles(RoleEnum.principal, RoleEnum.counselor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List a student\'s counselor session notes, decrypted (Principal/Counselor only)' })
  async findForStudent(@Param('studentId') studentId: string) {
    return this.noteService.findForStudent(studentId);
  }

  @Patch(':id/approved-summary')
  @Roles(RoleEnum.counselor, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or clear the counselor-authored summary explicitly shared with the guardian portal' })
  async setApprovedSummary(@Param('id') id: string, @Body() dto: SetApprovedSummaryDto) {
    return this.noteService.setApprovedSummary(id, dto.summary ?? null);
  }

  // Guardian-facing — structurally cannot return the encrypted raw note (see
  // CounselorNoteService.findApprovedSummariesForGuardian's `select` array).
  @Get('guardian/summaries')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approved, non-clinical summaries shared for one of the caller\'s own linked children' })
  async findApprovedSummariesForGuardian(
    @Query('studentId') studentId: string,
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
      throw new ForbiddenException('You are not authorized to view updates for this student.');
    }
    return this.noteService.findApprovedSummariesForGuardian(studentId);
  }
}
