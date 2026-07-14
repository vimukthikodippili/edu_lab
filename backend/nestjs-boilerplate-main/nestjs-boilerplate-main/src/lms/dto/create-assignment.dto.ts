import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId: number;

  @ApiProperty()
  @IsUUID('4')
  subjectId: string;

  @ApiProperty({ example: 'Chapter 4 — Fractions Worksheet' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  title: string;

  @ApiProperty({ example: 'Complete questions 1-10 on page 42. Show your working.' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 5000)
  instructions: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}
