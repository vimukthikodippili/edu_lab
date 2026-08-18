import { IsDateString, IsOptional } from 'class-validator';

export class GetStaffDayAttendanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
