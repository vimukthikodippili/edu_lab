import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class GenerateInvoicesDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;
}
