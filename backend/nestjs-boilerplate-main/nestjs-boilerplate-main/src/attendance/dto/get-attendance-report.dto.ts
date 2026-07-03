import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAttendanceReportDto {
  @ApiPropertyOptional({ description: 'Filter by class section ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId?: number;

  @ApiPropertyOptional({ description: 'Filter by individual student UUID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsDateString()
  endDate: string;
}
