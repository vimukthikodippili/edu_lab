import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StudentStatus } from '../entities/student.entity';

export class QueryStudentDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'Kasun', description: 'Search by name, admission number, or guardian phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 6, description: 'Filter by grade ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  gradeId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by class section ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  classSectionId?: number;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  academicYear?: string;
}
