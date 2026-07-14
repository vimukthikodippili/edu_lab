import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

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
}
