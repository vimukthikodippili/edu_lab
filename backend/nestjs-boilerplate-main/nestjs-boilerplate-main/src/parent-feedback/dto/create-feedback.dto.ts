import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { FeedbackCategory } from '../entities/parent-feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Canteen food quality' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ example: 'The canteen has been serving cold food for the past week.' })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ enum: FeedbackCategory, example: FeedbackCategory.FACILITIES })
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @ApiPropertyOptional({ description: 'The child this feedback concerns, if any' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}
