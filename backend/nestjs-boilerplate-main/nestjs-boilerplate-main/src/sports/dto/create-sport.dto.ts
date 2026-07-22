import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSportDto {
  @ApiProperty({ example: 'Under-17 Cricket' })
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'uuid-of-sport-type' })
  @IsUUID()
  sportTypeId: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  seasonStart: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  seasonEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'uuid-of-staff' })
  @IsUUID()
  coachId: string;
}
