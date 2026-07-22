import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetEquipmentReportDto {
  @ApiPropertyOptional({ description: 'Scope the report to a single lab' })
  @IsOptional()
  @IsUUID()
  labId?: string;
}
