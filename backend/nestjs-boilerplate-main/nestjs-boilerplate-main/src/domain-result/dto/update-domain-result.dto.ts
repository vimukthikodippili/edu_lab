import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DomainResultLevel } from '../entities/domain-result.entity';

export class UpdateDomainResultDto {
  @ApiPropertyOptional({ enum: DomainResultLevel })
  @IsOptional()
  @IsEnum(DomainResultLevel)
  level?: DomainResultLevel;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checkedSymptoms?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.counselorNotes !== null)
  @IsString()
  counselorNotes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  safetyFlagRaised?: boolean;
}
