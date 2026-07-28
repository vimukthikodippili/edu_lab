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
  Request,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { EventAttendanceService } from './event-attendance.service';
import { ScanTicketDto } from './dto/scan-ticket.dto';

/** P5-EV-02 — FR-P5-EV-13/14/15. Gate/oversight roles only — reuses `admin`/`principal` (existing
 * event-management roles) plus `security_officer` (the closest existing analogue for gate/
 * verification duty, per the guardian biometric release module), rather than inventing a new
 * "event staff" `RoleEnum` member. */
@ApiTags('School Events — Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'events', version: '1' })
export class EventAttendanceController {
  constructor(
    private readonly attendanceService: EventAttendanceService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
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

  @Post(':eventId/check-in')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan a guardian ticket or student participant QR to check them in' })
  async checkIn(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Body() dto: ScanTicketDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const scannedById = await this.resolveStaffId(req.user.id);
    return this.attendanceService.scanCode(eventId, dto.code, scannedById);
  }

  @Get(':eventId/attendance-dashboard')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Live registered/checked-in/no-show counts for an event' })
  async dashboard(@Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string) {
    return this.attendanceService.getDashboard(eventId);
  }

  @Get(':eventId/attendance-report/pdf')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @ApiOperation({ summary: 'Download the post-event attendance report as a PDF' })
  async attendanceReportPdf(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.attendanceService.generateAttendancePdf(eventId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-attendance.pdf"`);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }
}
