import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCoachAlertsDto {
  @ApiPropertyOptional({ description: 'Filter by acknowledged state' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  acknowledged?: boolean;
}
