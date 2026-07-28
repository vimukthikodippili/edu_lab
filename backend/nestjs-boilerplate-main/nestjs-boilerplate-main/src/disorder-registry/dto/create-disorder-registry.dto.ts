import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DisorderSection, RiskCategory } from '../entities/disorder-registry.entity';

export class CreateDisorderRegistryDto {
  @ApiProperty({ example: 'MHA-DOM-06' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Depression' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: DisorderSection, example: DisorderSection.EMOTIONAL_MENTAL_HEALTH })
  @IsEnum(DisorderSection)
  section: DisorderSection;

  @ApiProperty({ enum: RiskCategory, example: RiskCategory.EMOTIONAL_RISK })
  @IsEnum(RiskCategory)
  riskCategory: RiskCategory;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  ageMin: number;

  @ApiProperty({ example: 19 })
  @IsInt()
  @Min(0)
  ageMax: number;

  @ApiPropertyOptional({ type: [String], example: ['persistent sadness', 'loss of interest', 'fatigue'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @ApiPropertyOptional({ type: [String], example: ['DASS-21', 'PHQ-A (Adolescent Depression)'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tests?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  safetyFlag?: boolean;
}
