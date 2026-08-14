import { IsDateString, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsSaneAcademicYear } from '../validators/is-sane-academic-year.validator';

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
  @IsSaneAcademicYear()
  academicYear: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
