import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MatchType, TeamResult } from '../entities/match.entity';

export class UpdateMatchDto {
  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Royal College' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  opponent?: string;

  @ApiPropertyOptional({ example: 'Home Ground' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  venue?: string;

  @ApiPropertyOptional({ enum: MatchType })
  @IsOptional()
  @IsEnum(MatchType)
  matchType?: MatchType;

  @ApiPropertyOptional({ enum: TeamResult })
  @IsOptional()
  @IsEnum(TeamResult)
  teamResult?: TeamResult;

  @ApiPropertyOptional({ example: '2-1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  teamScore?: string;

  @ApiPropertyOptional({ example: 'Rained in the second half, match shortened.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
