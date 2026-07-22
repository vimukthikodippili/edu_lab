import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSportMetricDto {
  @ApiProperty({ example: 'Belt rank' })
  @IsNotEmpty()
  @MaxLength(120)
  metricName: string;

  @ApiPropertyOptional({ example: 'rank' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unit?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isTimeBased?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDistanceBased?: boolean;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  ordering: number;
}
