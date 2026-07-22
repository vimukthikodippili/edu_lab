import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MatchType, TeamResult } from '../entities/match.entity';

export class CreateMatchDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Royal College' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  opponent?: string;

  @ApiProperty({ example: 'Home Ground' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  venue: string;

  @ApiProperty({ enum: MatchType })
  @IsEnum(MatchType)
  matchType: MatchType;

  @ApiPropertyOptional({
    enum: TeamResult,
    description: 'Defaults to NO_RESULT if omitted — a fixture can be logged before it is played.',
  })
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
