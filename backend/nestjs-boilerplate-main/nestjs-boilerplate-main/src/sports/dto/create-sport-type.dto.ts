import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSportTypeDto {
  @ApiProperty({ example: 'Karate' })
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPersonalBestEligible?: boolean;
}
