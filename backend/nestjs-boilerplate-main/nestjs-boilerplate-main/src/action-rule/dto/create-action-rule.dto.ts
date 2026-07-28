import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RiskCategory } from '../../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

export class CreateActionRuleDto {
  @ApiPropertyOptional({
    enum: RiskCategory,
    example: RiskCategory.ADDICTION_RISK,
    description: 'Omit or send null to match ANY risk category (the catch-all wildcard).',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(RiskCategory)
  riskCategory?: RiskCategory | null;

  @ApiProperty({ enum: DomainResultLevel, example: DomainResultLevel.HIGH })
  @IsEnum(DomainResultLevel)
  minimumLevel: DomainResultLevel;

  @ApiProperty({ example: 'Digital Wellbeing Program' })
  @IsNotEmpty()
  @IsString()
  actionText: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 5, description: 'Ascending evaluation/display order; lower runs first.' })
  @IsInt()
  @Min(1)
  priority: number;
}
