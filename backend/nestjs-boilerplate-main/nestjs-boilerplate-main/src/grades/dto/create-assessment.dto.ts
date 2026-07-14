import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType } from '../entities/assessment.entity';

export class CreateAssessmentDto {
  @IsUUID()
  subjectId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  termId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId: number;

  @IsString()
  @Length(1, 120)
  title: string;

  @IsEnum(AssessmentType)
  assessmentType: AssessmentType;

  @IsDateString()
  scheduledDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  totalMarks: number;

  @IsOptional()
  @IsBoolean()
  sectionHeadOverride?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresMaterialsCheck?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
