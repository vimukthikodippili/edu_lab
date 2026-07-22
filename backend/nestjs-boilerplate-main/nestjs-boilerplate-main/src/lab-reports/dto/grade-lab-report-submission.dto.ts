import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeLabReportSubmissionDto {
  @ApiProperty({ example: 21 })
  @IsNumber()
  @Min(0)
  grade: number;

  @ApiPropertyOptional({ example: 'Clear method, but the conclusion needs to reference your actual results.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
