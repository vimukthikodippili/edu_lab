import { IsInt, Max, Min } from 'class-validator';

export class SubmitMoodCheckInDto {
  @IsInt()
  @Min(1)
  @Max(5)
  moodValue: number;
}
