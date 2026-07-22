import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID } from 'class-validator';

export class QueryExperimentLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  labId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  classSectionId?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
