import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateGradingBandDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minPercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxPercent: number;

  @IsString()
  @MaxLength(4)
  letter: string;

  @Type(() => Number)
  @IsInt()
  ordering: number;
}
