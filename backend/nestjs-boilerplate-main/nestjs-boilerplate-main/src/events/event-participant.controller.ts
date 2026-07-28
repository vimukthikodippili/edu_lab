import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StudentEntity } from '../students/entities/student.entity';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { EventParticipantService } from './event-participant.service';
import { AddParticipantsDto } from './dto/add-participants.dto';

/** P5-EV-02 — FR-P5-EV-16. `participants/me` and `participants/class/:classSectionId/bulk-check-in`
 * are distinct segment-count paths, no route-collision risk. No shared `resolveStudentId()` helper
 * exists anywhere in this codebase (mirrors the already-established "no shared resolveGuardianId
 * either" situation) — inlined here per this module's established per-controller convention. */
@ApiTags('School Events — Participants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'events', version: '1' })
export class EventParticipantController {
  constructor(
    private readonly participantService: EventParticipantService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException('No staff record linked to your account.');
    }
    return staff.id;
  }

  private async resolveStudentId(userId: unknown): Promise<string> {
    const student = await this.studentRepo.findOne({ where: { userId: userId as number } });
    if (!student) {
      throw new NotFoundException('Your account is not linked to a student record — contact your school administrator.');
    }
    return student.id;
  }

  @Post(':eventId/participants')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add students (by class section and/or individually) as expected participants — issues each a QR' })
  async addParticipants(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Body() dto: AddParticipantsDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const addedByStaffId = await this.resolveStaffId(req.user.id);
    return this.participantService.addParticipants(eventId, dto, addedByStaffId);
  }

  @Get(':eventId/participants')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List expected student participants with their check-in status' })
  async listParticipants(@Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string) {
    return this.participantService.listParticipants(eventId);
  }

  @Get(':eventId/participants/me')
  @Roles(RoleEnum.student)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My own participation record and QR for this event' })
  async myParticipation(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const studentId = await this.resolveStudentId(req.user.id);
    return this.participantService.getMyParticipation(eventId, studentId);
  }

  @Post(':eventId/participants/class/:classSectionId/bulk-check-in')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk-check-in every expected participant in my own class section — idempotent' })
  async bulkCheckIn(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Param('classSectionId', ParseIntPipe) classSectionId: number,
    @Request() req: { user: { id: unknown } },
  ) {
    const teacherStaffId = await this.resolveStaffId(req.user.id);
    const checkedInCount = await this.participantService.classTeacherBulkCheckIn(eventId, classSectionId, teacherStaffId);
    return { checkedInCount };
  }
}
