import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/** Shared across all four dashboard panels — applied wherever semantically relevant to that
 * panel's own data shape (e.g. equipment health has no subjectId/classSectionId dimension).
 * No "infer current term" helper exists anywhere in this codebase (confirmed via research), so
 * dateFrom/dateTo are explicit optional inputs, matching AttendanceReportService's own
 * convention — omitted means unfiltered/all-time, never a guessed "current term." */
export class LabOverviewFilterDto {
  @IsOptional()
  @IsUUID('4')
  labId?: string;

  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classSectionId?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Working-days/periods have no single correct value per lab (no lab-to-gradeStage link
  // exists), so they're caller-overridable rather than silently guessed — default to the same
  // constants SchoolCalendarConfigService itself falls back to.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workingDaysPerWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodsPerDay?: number;
}
