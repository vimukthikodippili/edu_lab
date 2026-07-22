import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class TopicScoreEntryDto {
  @IsUUID()
  subjectTopicId: string;

  @IsNumber()
  @Min(0)
  score: number;
}

export class GradeSubmissionDto {
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  grade?: string;

  @ApiPropertyOptional({ example: 'Great work — clear working shown throughout.' })
  @IsOptional()
  @IsString()
  @Length(1, 3000)
  feedback?: string;

  /** Only accepted when the assignment has topic allocations. The total is computed
   * automatically as the sum of these — there is deliberately no separate total field. */
  @ApiPropertyOptional({ type: [TopicScoreEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicScoreEntryDto)
  topicScores?: TopicScoreEntryDto[];
}
