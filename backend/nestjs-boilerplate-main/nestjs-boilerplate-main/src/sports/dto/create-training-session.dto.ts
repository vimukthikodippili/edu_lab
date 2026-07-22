import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTrainingSessionDto {
  @ApiProperty({ example: '2026-08-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Ran fielding drills and net practice for 90 minutes.' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ type: [String], example: ['uuid-of-student'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  attendeeStudentIds: string[];

  @ApiPropertyOptional({ example: 'uuid-of-student-leader' })
  @IsOptional()
  @IsUUID('4')
  sessionLeaderStudentId?: string;
}
