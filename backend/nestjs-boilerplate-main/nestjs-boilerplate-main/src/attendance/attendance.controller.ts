import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
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
import { GetAttendanceReportDto } from './dto/get-attendance-report.dto';
import { ExportAttendanceReportDto } from './dto/export-attendance-report.dto';
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
