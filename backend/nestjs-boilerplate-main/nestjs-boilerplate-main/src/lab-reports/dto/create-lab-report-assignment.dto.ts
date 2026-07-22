import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateLabReportAssignmentDto {
  @ApiProperty({ example: 'Titration Lab Report' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Write up your titration experiment covering method, results, and conclusion.' })
  @IsNotEmpty()
  @IsString()
  instructions: string;

  @ApiProperty({ example: '2026-08-25' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: '10 marks method, 10 marks results/analysis, 5 marks conclusion.' })
  @IsNotEmpty()
  @IsString()
  markingScheme: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  maxMarks: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeInTermAssessment?: boolean;

  @ApiPropertyOptional({ description: 'Required when includeInTermAssessment is true' })
  @IsOptional()
  @IsInt()
  termId?: number;
}
