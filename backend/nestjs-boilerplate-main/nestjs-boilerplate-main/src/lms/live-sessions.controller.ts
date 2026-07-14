import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
import { AllConfigType } from '../config/config.type';
import { LiveSessionsService, LiveSessionWithAccess } from './live-sessions.service';
import { LiveKitService, LiveKitTokenResult } from './livekit.service';
import { LiveAttendanceService, LiveSessionAttendanceRow } from './live-attendance.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { AttachWhiteboardSnapshotDto } from './dto/attach-whiteboard-snapshot.dto';
import { LiveSessionEntity } from './entities/live-session.entity';
import { LiveSessionAttendanceEntity } from './entities/live-session-attendance.entity';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('LMS — Live Classes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lms/live-classes', version: '1' })
export class LiveSessionsController {
  private readonly logger = new Logger(LiveSessionsController.name);

  constructor(
    private readonly liveSessionsService: LiveSessionsService,
    private readonly liveKitService: LiveKitService,
    private readonly liveAttendanceService: LiveAttendanceService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  private async resolveStaff(
    userId: unknown,
  ): Promise<{ id: string; firstName: string; lastName: string }> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException(
        'No staff record linked to your account.',
      );
    return staff;
  }

  private async resolveStaffId(userId: unknown): Promise<string> {
    const staff = await this.resolveStaff(userId);
    return staff.id;
  }

  private async resolveStudent(userId: number): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return student;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  private getJoinWindowMinutes(): number {
    return this.configService.get('liveSession.joinWindowMinutes', { infer: true }) ?? 10;
  }

  @Post()
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule a live class for a class section + subject' })
  @ApiCreatedResponse({ type: LiveSessionEntity })
  async create(
    @Body() dto: CreateLiveSessionDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<LiveSessionEntity> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.liveSessionsService.create(dto, staffId, this.isPrivileged(req));
  }

  @Get('my-class')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List live classes for the caller's own class section" })
  async findForMyClass(
    @Request() req: { user: { id: number } },
  ): Promise<LiveSessionWithAccess[]> {
    const student = await this.studentRepo.findOne({ where: { userId: req.user.id } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return this.liveSessionsService.findForClassSection(
      student.classSectionId,
      this.getJoinWindowMinutes(),
    );
  }

  @Get('mine')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List live classes scheduled by the caller' })
  async findMine(
    @Request() req: { user: { id: unknown } },
  ): Promise<LiveSessionWithAccess[]> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.liveSessionsService.findMine(staffId, this.getJoinWindowMinutes());
  }

  @Post(':id/token')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.student,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mint a LiveKit join token for the caller to enter this live session' })
  async mintToken(
    @Param('id') id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<LiveKitTokenResult> {
    const session = await this.liveSessionsService.findById(id);

    if (String(req.user.role?.id) === String(RoleEnum.student)) {
      const student = await this.resolveStudent(req.user.id as number);
      this.liveSessionsService.assertCanJoinAsStudent(
        session,
        student.classSectionId,
        this.getJoinWindowMinutes(),
      );
      return this.liveKitService.mintToken(
        session.id,
        student.id,
        `${student.firstName} ${student.lastName}`,
        false,
      );
    }

    const staff = await this.resolveStaff(req.user.id);
    await this.liveSessionsService.assertCanHost(session, staff.id, this.isPrivileged(req));

    try {
      await this.liveSessionsService.startRecordingFor(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to start recording for session ${session.id}: ${message}`);
    }

    try {
      this.liveSessionsService.notifySessionStarted(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to emit session-started event for session ${session.id}: ${message}`);
    }

    return this.liveKitService.mintToken(
      session.id,
      staff.id,
      `${staff.firstName} ${staff.lastName}`,
      true,
    );
  }

  @Post(':id/end')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End a live session — disconnects all participants' })
  @ApiOkResponse({ type: LiveSessionEntity })
  async end(
    @Param('id') id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<LiveSessionEntity> {
    const staffId = await this.resolveStaffId(req.user.id);
    const session = await this.liveSessionsService.endSession(id, staffId, this.isPrivileged(req));
    await this.liveKitService.endRoom(session.id);

    try {
      await this.liveSessionsService.stopRecordingFor(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to stop recording for session ${session.id}: ${message}`);
    }

    return session;
  }

  @Post(':id/whiteboard-snapshot')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Attach the teacher's captured whiteboard image/PDF to this session" })
  @ApiOkResponse({ type: LiveSessionEntity })
  async attachWhiteboardSnapshot(
    @Param('id') id: string,
    @Body() dto: AttachWhiteboardSnapshotDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<LiveSessionEntity> {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.liveSessionsService.attachWhiteboardSnapshot(
      id,
      { imageFileId: dto.imageFileId, pdfFileId: dto.pdfFileId },
      staffId,
      this.isPrivileged(req),
    );
  }

  @Post(':id/attendance/join')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Record that the caller joined this live session — auto-marks attendance" })
  @ApiCreatedResponse({ type: LiveSessionAttendanceEntity })
  async recordJoin(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ): Promise<LiveSessionAttendanceEntity> {
    const session = await this.liveSessionsService.findById(id);
    const student = await this.resolveStudent(req.user.id);
    this.liveSessionsService.assertCanJoinAsStudent(
      session,
      student.classSectionId,
      this.getJoinWindowMinutes(),
    );
    return this.liveAttendanceService.recordJoin(id, student.id);
  }

  @Post(':id/attendance/leave')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record that the caller left this live session — computes actual duration present' })
  @ApiOkResponse({ type: LiveSessionAttendanceEntity })
  async recordLeave(
    @Param('id') id: string,
    @Request() req: { user: { id: number } },
  ): Promise<LiveSessionAttendanceEntity> {
    const student = await this.resolveStudent(req.user.id);
    return this.liveAttendanceService.recordLeave(id, student.id);
  }

  @Get(':id/attendance')
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List who joined this live session and for how long' })
  async getAttendance(
    @Param('id') id: string,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ): Promise<LiveSessionAttendanceRow[]> {
    const session = await this.liveSessionsService.findById(id);
    const staff = await this.resolveStaff(req.user.id);
    await this.liveSessionsService.assertCanHost(session, staff.id, this.isPrivileged(req));
    return this.liveAttendanceService.findForSession(id);
  }
}
