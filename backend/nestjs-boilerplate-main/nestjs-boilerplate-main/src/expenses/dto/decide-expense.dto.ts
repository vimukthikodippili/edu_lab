import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideExpenseDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  decisionNote?: string;
}
