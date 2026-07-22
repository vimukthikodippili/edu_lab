import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { GetEquipmentReportDto } from './get-equipment-report.dto';

export class ExportEquipmentReportDto extends GetEquipmentReportDto {
  @ApiProperty({ enum: ['excel', 'pdf'], description: 'Export format' })
  @IsIn(['excel', 'pdf'])
  format: 'excel' | 'pdf';
}
