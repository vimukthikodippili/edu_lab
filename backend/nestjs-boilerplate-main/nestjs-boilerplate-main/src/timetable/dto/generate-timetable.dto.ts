import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class GenerateTimetableDto {
  @IsString()
  @Length(4, 4)
  academicYear: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(13)
  gradeId?: number;
}
