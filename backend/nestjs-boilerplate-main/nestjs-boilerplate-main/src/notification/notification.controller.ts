import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @ApiOperation({ summary: 'List notifications for a staff member' })
  @ApiQuery({ name: 'staffId', type: String, description: 'Staff UUID' })
  @Get()
  list(@Query('staffId', ParseUUIDPipe) staffId: string) {
    return this.service.findForStaff(staffId);
  }

  @ApiOperation({ summary: 'Get unread notification count for a staff member' })
  @ApiQuery({ name: 'staffId', type: String, description: 'Staff UUID' })
  @Get('unread-count')
  unreadCount(@Query('staffId', ParseUUIDPipe) staffId: string) {
    return this.service.getUnreadCount(staffId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.service.markRead(id, staffId);
  }

  // ── Guardian notifications ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'List absence alerts for a guardian' })
  @ApiQuery({ name: 'guardianId', type: String, description: 'Guardian UUID' })
  @Get('guardian')
  listForGuardian(@Query('guardianId', ParseUUIDPipe) guardianId: string) {
    return this.service.findForGuardian(guardianId);
  }

  @ApiOperation({ summary: 'Get unread absence-alert count for a guardian' })
  @ApiQuery({ name: 'guardianId', type: String, description: 'Guardian UUID' })
  @Get('guardian/unread-count')
  guardianUnreadCount(@Query('guardianId', ParseUUIDPipe) guardianId: string) {
    return this.service.getGuardianUnreadCount(guardianId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: 'Mark a guardian notification as read' })
  @Patch('guardian/:id/read')
  @HttpCode(HttpStatus.OK)
  markGuardianRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('guardianId', ParseUUIDPipe) guardianId: string,
  ) {
    return this.service.markReadForGuardian(id, guardianId);
  }

  // ── Student notifications ──────────────────────────────────────────────────

  @ApiOperation({ summary: 'List notifications for a student' })
  @ApiQuery({ name: 'studentId', type: String, description: 'Student UUID' })
  @Get('student')
  listForStudent(@Query('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.findForStudent(studentId);
  }

  @ApiOperation({ summary: 'Get unread notification count for a student' })
  @ApiQuery({ name: 'studentId', type: String, description: 'Student UUID' })
  @Get('student/unread-count')
  studentUnreadCount(@Query('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.getStudentUnreadCount(studentId).then((count) => ({ count }));
  }

  @ApiOperation({ summary: 'Mark a student notification as read' })
  @Patch('student/:id/read')
  @HttpCode(HttpStatus.OK)
  markStudentRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.service.markReadForStudent(id, studentId);
  }
}
