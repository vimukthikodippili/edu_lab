import { IsDateString, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAcademicTermDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  termNumber: number;

  @IsString()
  @Length(4, 4)
  academicYear: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
