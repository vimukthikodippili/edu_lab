import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LiveClassMonitorQueryDto {
  @ApiPropertyOptional({ description: 'Lower grade level bound (Section Head range)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(13)
  gradeFrom?: number;

  @ApiPropertyOptional({ description: 'Upper grade level bound (Section Head range)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(13)
  gradeTo?: number;
}
