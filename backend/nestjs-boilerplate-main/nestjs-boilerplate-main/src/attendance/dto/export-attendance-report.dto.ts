import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GetAttendanceReportDto } from './get-attendance-report.dto';

export class ExportAttendanceReportDto extends GetAttendanceReportDto {
  @ApiProperty({ enum: ['excel', 'pdf'], description: 'Export format' })
  @IsIn(['excel', 'pdf'])
  format: 'excel' | 'pdf';
}
