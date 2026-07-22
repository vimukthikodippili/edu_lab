import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PerformanceStatus } from '../entities/student-match-performance.entity';
import { PerformanceEntryDto } from './performance-entry.dto';

export class BulkUpsertPerformanceDto {
  @ApiProperty({ enum: PerformanceStatus })
  @IsEnum(PerformanceStatus)
  status: PerformanceStatus;

  @ApiProperty({ type: [PerformanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PerformanceEntryDto)
  entries: PerformanceEntryDto[];
}
