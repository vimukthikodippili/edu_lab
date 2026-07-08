import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuerySyllabusUnitDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-...' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId?: number;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  academicYear?: string;
}
