import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { MarkStatus } from '../entities/mark.entity';

export class TopicScoreEntryDto {
  @IsUUID()
  subjectTopicId: string;

  @IsNumber()
  @Min(0)
  score: number;
}

export class MarkEntryDto {
  @IsUUID()
  studentId: string;

  /** Legacy flat score — only accepted for an assessment with zero topic allocations
   * (predates topic tracking). Any topic-tracked assessment must use `topicScores`
   * instead; the total is then computed automatically and this field is rejected. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicScoreEntryDto)
  topicScores?: TopicScoreEntryDto[];
}

export class BulkUpsertMarksDto {
  @IsUUID()
  assessmentId: string;

  @IsEnum(MarkStatus)
  status: MarkStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  entries: MarkEntryDto[];
}
