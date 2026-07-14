import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLiveSessionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId: number;

  @ApiProperty()
  @IsUUID('4')
  subjectId: string;

  @ApiPropertyOptional({ example: 'Revision session — Algebra' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  title?: string;

  @ApiProperty({ example: '2026-08-01T09:00:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(180)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  joinUrl?: string;
}
