import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpsertClassDiaryEntryDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  timetableEntryId: number;

  @ApiProperty({ example: '2026-07-06' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Covered fractions — addition and subtraction.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}
