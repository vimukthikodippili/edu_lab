import { IsDateString, IsEnum } from 'class-validator';
import { StaffAttendanceStatus } from '../entities/staff-attendance.entity';

export class MarkStaffAttendanceDto {
  @IsDateString()
  date: string;

  @IsEnum(StaffAttendanceStatus)
  status: StaffAttendanceStatus;
}
