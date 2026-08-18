import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UnprocessableEntityException,
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
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { NotificationService } from './notification.service';

// Any role that has a corresponding StaffEntity record — mirrors the staff-role
// set used elsewhere (e.g. teacher-performance) for "who can have staff notifications."
const STAFF_ROLES = [
  RoleEnum.admin,
  RoleEnum.principal,
  RoleEnum.section_head,
  RoleEnum.teacher,
  RoleEnum.counselor,
  RoleEnum.security_officer,
  RoleEnum.librarian,
  RoleEnum.accountant,
  RoleEnum.school_psychologist,
];

type AuthRequest = { user: { id: number } };

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,
    @InjectRepository(GuardianEntity)
    private readonly guardianRepository: Repository<GuardianEntity>,
  ) {}

  // Every ID below is resolved from the caller's own JWT, never from a client-supplied
  // query param — callers must not be able to read or mark-read another person's
  // notifications by guessing/supplying someone else's staff/guardian/student ID.
  private async resolveStaffId(userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException('No staff record linked to your account.');
    }
    return staff.id;
  }

  private async resolveGuardianId(userId: number): Promise<string> {
    const guardian = await this.guardianRepository.findOne({ where: { userId } });
    if (!guardian) {
      throw new UnprocessableEntityException('No guardian record linked to your account.');
    }
    return guardian.id;
  }

  private async resolveStudentId(userId: number): Promise<string> {
    const student = await this.studentRepository.findOne({ where: { userId } });
    if (!student) {
      throw new UnprocessableEntityException('No student record linked to your account.');
    }
    return student.id;
  }

  @ApiOperation({ summary: "List notifications for the caller's own staff record" })
  @Roles(...STAFF_ROLES)
  @Get()
  async list(@Request() req: AuthRequest) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.service.findForStaff(staffId);
  }

  @ApiOperation({ summary: "Get unread notification count for the caller's own staff record" })
  @Roles(...STAFF_ROLES)
  @Get('unread-count')
  async unreadCount(@Request() req: AuthRequest) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.service.getUnreadCount(staffId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: "Mark one of the caller's own notifications as read" })
  @Roles(...STAFF_ROLES)
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.service.markRead(id, staffId);
  }

  // ── Guardian notifications ─────────────────────────────────────────────────

  @ApiOperation({ summary: "List absence alerts for the caller's own guardian record" })
  @Roles(RoleEnum.guardian)
  @Get('guardian')
  async listForGuardian(@Request() req: AuthRequest) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.service.findForGuardian(guardianId);
  }

  @ApiOperation({ summary: "Get unread absence-alert count for the caller's own guardian record" })
  @Roles(RoleEnum.guardian)
  @Get('guardian/unread-count')
  async guardianUnreadCount(@Request() req: AuthRequest) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.service.getGuardianUnreadCount(guardianId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: "Mark one of the caller's own guardian notifications as read" })
  @Roles(RoleEnum.guardian)
  @Patch('guardian/:id/read')
  @HttpCode(HttpStatus.OK)
  async markGuardianRead(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.service.markReadForGuardian(id, guardianId);
  }

  // ── Student notifications ──────────────────────────────────────────────────

  @ApiOperation({ summary: "List notifications for the caller's own student record" })
  @Roles(RoleEnum.student)
  @Get('student')
  async listForStudent(@Request() req: AuthRequest) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.service.findForStudent(studentId);
  }

  @ApiOperation({ summary: "Get unread notification count for the caller's own student record" })
  @Roles(RoleEnum.student)
  @Get('student/unread-count')
  async studentUnreadCount(@Request() req: AuthRequest) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.service.getStudentUnreadCount(studentId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: "Mark one of the caller's own student notifications as read" })
  @Roles(RoleEnum.student)
  @Patch('student/:id/read')
  @HttpCode(HttpStatus.OK)
  async markStudentRead(@Param('id', ParseIntPipe) id: number, @Request() req: AuthRequest) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.service.markReadForStudent(id, studentId);
  }
}
