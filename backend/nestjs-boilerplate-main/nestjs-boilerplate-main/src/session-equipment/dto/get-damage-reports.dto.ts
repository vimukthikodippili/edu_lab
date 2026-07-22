import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class GetDamageReportsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  labId?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['damaged', 'missing'] })
  @IsOptional()
  @IsIn(['damaged', 'missing'])
  reportType?: 'damaged' | 'missing';
}
