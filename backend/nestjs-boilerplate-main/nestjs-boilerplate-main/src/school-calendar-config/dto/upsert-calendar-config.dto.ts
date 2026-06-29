import { IsInt, Max, Min } from 'class-validator';

export class UpsertCalendarConfigDto {
  @IsInt()
  @Min(1)
  @Max(7)
  workingDaysPerWeek: number;

  @IsInt()
  @Min(1)
  @Max(20)
  periodsPerDay: number;
}
