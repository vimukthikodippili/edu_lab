import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSubjectSelectionWindowDto {
  @IsUUID('4')
  gradeStageId: string;

  @IsInt()
  @Min(2000)
  academicYear: number;

  @IsDateString()
  openDate: string;

  @IsDateString()
  closeDate: string;

  @IsInt()
  @Min(0)
  minOptionalSubjects: number;

  @IsInt()
  @Min(0)
  maxOptionalSubjects: number;

  @IsOptional()
  @IsBoolean()
  requiresStreamSelection?: boolean;
}
