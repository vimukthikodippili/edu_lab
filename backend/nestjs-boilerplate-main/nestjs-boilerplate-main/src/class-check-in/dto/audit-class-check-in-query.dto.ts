import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditClassCheckInQueryDto {
  @ApiPropertyOptional({ description: 'Filter by teacher (staff) UUID' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ description: 'Filter by class section ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
