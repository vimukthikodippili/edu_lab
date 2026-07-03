import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';
import { ExpenseCategory } from '../entities/expense-approval.entity';

export class CreateExpenseDto {
  @IsNumber()
  @IsPositive()
  @Max(99999999.99)
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  description: string;
}
