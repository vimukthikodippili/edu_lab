import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';

export class PerformanceEntryDto {
  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  studentId: string;

  /** Keyed by SportMetric.metricName — validated in the service against that sport's live
   * metric config, since the valid key set is data-driven per sportType, not a fixed DTO shape. */
  @ApiProperty({ example: { 'Runs scored': 42, 'Balls faced': 30 } })
  @IsObject()
  metricValues: Record<string, number>;
}
