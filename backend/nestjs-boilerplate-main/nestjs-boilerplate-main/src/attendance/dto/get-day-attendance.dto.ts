import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class GetDayAttendanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId: number;

  @IsDateString()
  date: string;
}
