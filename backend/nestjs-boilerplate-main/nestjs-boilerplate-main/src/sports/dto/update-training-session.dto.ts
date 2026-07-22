import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateTrainingSessionDto {
  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Ran fielding drills and net practice for 90 minutes.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  attendeeStudentIds?: string[];

  @ApiPropertyOptional({ example: 'uuid-of-student-leader' })
  @IsOptional()
  @IsUUID('4')
  sessionLeaderStudentId?: string;
}
