import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class MarkCompleteLessonPlanEntryDto {
  @ApiProperty({ example: 'uuid-of-syllabus-unit' })
  @IsUUID()
  syllabusUnitId: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'academicYear must be a 4-digit year' })
  academicYear: string;

  @ApiProperty({ example: '2026-03-15', required: false })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;
}
