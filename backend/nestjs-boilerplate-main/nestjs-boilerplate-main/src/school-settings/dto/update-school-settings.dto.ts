import { IsBoolean, IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateSchoolSettingsDto {
  @IsInt()
  @Min(1)
  @Max(120)
  lateThresholdMinutes: number;

  @IsBoolean()
  @IsOptional()
  isPublicSportsBoardEnabled?: boolean;
}
