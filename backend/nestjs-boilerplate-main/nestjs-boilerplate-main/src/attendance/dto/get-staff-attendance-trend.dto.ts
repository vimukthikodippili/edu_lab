import { IsDateString, IsEnum } from 'class-validator';

export enum AttendanceTrendGranularity {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class GetStaffAttendanceTrendDto {
  @IsEnum(AttendanceTrendGranularity)
  granularity: AttendanceTrendGranularity;

  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
