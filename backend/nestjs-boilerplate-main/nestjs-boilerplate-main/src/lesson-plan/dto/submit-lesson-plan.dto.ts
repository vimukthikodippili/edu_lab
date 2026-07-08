import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Min } from 'class-validator';

export class SubmitLessonPlanDto {
  @ApiProperty({ example: 'uuid-of-subject' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId: number;

  @ApiProperty({ example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'academicYear must be a 4-digit year' })
  academicYear: string;
}
