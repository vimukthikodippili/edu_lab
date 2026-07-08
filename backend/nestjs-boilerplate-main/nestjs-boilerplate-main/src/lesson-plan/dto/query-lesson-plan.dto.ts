import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryLessonPlanDto {
  @ApiPropertyOptional({ example: 'uuid-of-subject' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeId?: number;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  academicYear?: string;
}
