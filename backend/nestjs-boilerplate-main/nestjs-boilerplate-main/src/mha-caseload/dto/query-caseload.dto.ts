import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

export class QueryCaseloadDto {
  @ApiPropertyOptional({ enum: DomainResultLevel, description: "Filter by the latest session's highest risk-category level" })
  @IsOptional()
  @IsEnum(DomainResultLevel)
  riskLevel?: DomainResultLevel;

  @ApiPropertyOptional({ example: 6, description: 'Filter by grade ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gradeId?: number;

  @ApiPropertyOptional({ example: true, description: 'Only students with at least one open SessionAction' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasPendingActions?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Only students with a safety flag raised in any session (regardless of age)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasSafetyFlag?: boolean;
}
