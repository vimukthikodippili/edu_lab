import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateLabBookingDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  periodNumber: number;

  @ApiPropertyOptional({ description: "One of the teacher's own timetable entries — when given, classSectionId/subjectId are derived from it" })
  @IsOptional()
  @IsInt()
  timetableEntryId?: number;

  @ApiPropertyOptional({ description: 'Required when timetableEntryId is omitted' })
  @IsOptional()
  @IsInt()
  classSectionId?: number;

  @ApiPropertyOptional({ description: 'Required when timetableEntryId is omitted' })
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @ApiPropertyOptional({ example: 'Titration practical — Grade 11 Chemistry' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;
}
