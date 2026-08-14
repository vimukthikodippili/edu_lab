import { IsDateString, IsString, Length } from 'class-validator';
import { IsSaneAcademicYear } from '../validators/is-sane-academic-year.validator';

export class StartAcademicYearDto {
  @IsString()
  @IsSaneAcademicYear()
  year: string;

  @IsString()
  @Length(1, 80)
  termName: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
