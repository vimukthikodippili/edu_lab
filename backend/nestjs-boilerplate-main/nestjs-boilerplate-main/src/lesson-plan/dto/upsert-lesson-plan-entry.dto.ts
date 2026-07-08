import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches } from 'class-validator';
import { IsUUID } from 'class-validator';

export class UpsertLessonPlanEntryDto {
  @ApiProperty({ example: 'uuid-of-syllabus-unit' })
  @IsUUID()
  syllabusUnitId: string;

  @ApiProperty({ example: '2026-03-15' })
  @IsDateString()
  plannedCompletionDate: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'academicYear must be a 4-digit year' })
  academicYear: string;
}
