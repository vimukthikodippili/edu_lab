import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { AttendanceService } from './attendance.service';
import { AttendanceReportService } from './attendance-report.service';
import { BulkMarkAttendanceDto } from './dto/bulk-mark-attendance.dto';
import { GetDayAttendanceDto } from './dto/get-day-attendance.dto';
import { GetStaffDayAttendanceDto } from './dto/get-staff-day-attendance.dto';
import { GetAttendanceReportDto } from './dto/get-attendance-report.dto';
import { ExportAttendanceReportDto } from './dto/export-attendance-report.dto';
import { MarkStaffAttendanceDto } from './dto/mark-staff-attendance.dto';
import { GetStaffAttendanceTrendDto } from './dto/get-staff-attendance-trend.dto';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly attendanceReportService: AttendanceReportService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveTeacherId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException(
        'No staff record linked to your account email.',
      );
    }
    return staff.id;
  }

  @Get('my-class-sections')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the teacher's assigned class sections" })
  async myClassSections(@Request() req: { user: { id: unknown } }) {
    const teacherId = await this.resolveTeacherId(req.user.id);
    return this.attendanceService.getMyClassSections(teacherId);
  }

  @Get('staff/me/today')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.security_officer,
    RoleEnum.librarian,
    RoleEnum.accountant,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the caller's own staff attendance status for today" })
  async myAttendanceToday(@Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveTeacherId(req.user.id);
    const record = await this.attendanceService.getMyAttendanceToday(staffId);
    return { markedToday: !!record, record };
  }

  @Post('staff/check-in')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.security_officer,
    RoleEnum.librarian,
    RoleEnum.accountant,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Self-mark the caller's own attendance as present for today" })
  async checkInSelf(@Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveTeacherId(req.user.id);
    return this.attendanceService.markMyAttendance(staffId);
  }

  @Get('staff/audit')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Every active staff member cross-referenced against their attendance status for a given date (admin/principal only)' })
  async staffAttendanceAudit(@Query() query: GetStaffDayAttendanceDto) {
    const date = query.date ?? new Date().toISOString().split('T')[0];
    return this.attendanceService.getStaffDayAttendance(date);
  }

  @Put('staff/:staffId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set or correct a staff member's attendance status for a given date (admin/principal only)" })
  async markStaffAttendance(
    @Param('staffId') staffId: string,
    @Body() dto: MarkStaffAttendanceDto,
    @Request() req: { user: { id: unknown } },
  ) {
    let markedById: string | null = null;
    try {
      markedById = await this.resolveTeacherId(req.user.id);
    } catch {
      markedById = null;
    }
    return this.attendanceService.markStaffAttendance(
      staffId,
      dto.date,
      dto.status,
      markedById,
    );
  }

  @Get('staff/trend')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Whole-school staff attendance rate trend bucketed by day, month, or year (admin/principal only)' })
  async staffAttendanceTrend(@Query() query: GetStaffAttendanceTrendDto) {
    return this.attendanceService.getStaffAttendanceTrend(
      query.granularity,
      query.from,
      query.to,
    );
  }

  @Get('class-sections')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all class sections (for report filters)' })
  async getAllClassSections() {
    return this.attendanceReportService.getAllClassSections();
  }

  @Get()
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get day attendance roster for a class section' })
  async getDayAttendance(@Query() query: GetDayAttendanceDto) {
    return this.attendanceService.getDayAttendance(
      query.classSectionId,
      query.date,
    );
  }

  @Get('reports')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate attendance report aggregated by student over a date range',
  })
  async getReport(@Query() dto: GetAttendanceReportDto) {
    return this.attendanceReportService.generateReport(dto);
  }

  @Get('reports/export')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher)
  @ApiOperation({ summary: 'Export attendance report as Excel (.xlsx) or PDF' })
  async exportReport(
    @Query() dto: ExportAttendanceReportDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (dto.format === 'excel') {
        const buffer = await this.attendanceReportService.exportExcel(dto);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance-${dto.startDate}-${dto.endDate}.xlsx"`,
        );
        res.send(buffer);
      } else {
        const buffer = await this.attendanceReportService.exportPdf(dto);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance-${dto.startDate}-${dto.endDate}.pdf"`,
        );
        res.send(buffer);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }

  @Post('bulk')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk mark (upsert) attendance for a class section' })
  async bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const teacherId = await this.resolveTeacherId(req.user.id);
    return this.attendanceService.bulkMark(dto, teacherId);
  }
}
