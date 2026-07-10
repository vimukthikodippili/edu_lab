import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpsertStudentYearEndNoteDto {
  @IsString()
  @Length(4, 4)
  academicYear: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsString()
  extracurricularActivities?: string;

  @IsOptional()
  @IsString()
  generalRemarks?: string;
}
