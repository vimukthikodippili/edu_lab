import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateFeeStructureDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  gradeId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;

  @IsString()
  @MaxLength(100)
  feeCategory: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}
