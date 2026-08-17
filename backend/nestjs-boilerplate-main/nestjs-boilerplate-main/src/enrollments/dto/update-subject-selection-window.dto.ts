import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSubjectSelectionWindowDto {
  @IsOptional()
  @IsDateString()
  openDate?: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOptionalSubjects?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxOptionalSubjects?: number;

  @IsOptional()
  @IsBoolean()
  requiresStreamSelection?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
