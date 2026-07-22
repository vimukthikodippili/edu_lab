import {
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType } from '../entities/assessment.entity';
import { QuestionType } from '../entities/assessment-topic-allocation.entity';

export class TopicAllocationDto {
  @IsUUID()
  subjectTopicId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks: number;

  @IsEnum(QuestionType)
  questionType: QuestionType;
}

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

  /** Assessment.totalMarks is computed as the sum of these — there is deliberately no
   * separate totalMarks field on this DTO, so a manual total cannot be supplied at all. */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TopicAllocationDto)
  topicAllocations: TopicAllocationDto[];

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
