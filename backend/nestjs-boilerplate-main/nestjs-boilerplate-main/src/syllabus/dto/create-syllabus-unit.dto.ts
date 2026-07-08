import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSyllabusUnitDto {
  @ApiProperty({ example: 'a1b2c3d4-...', description: 'UUID of the subject' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 10, description: 'Grade ID (1–13)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId: number;

  @ApiProperty({ example: 'Chapter 1 — Cell Biology', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Introduction to cell structure and function', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 1, description: 'Display order within the subject/grade/year' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ example: '2026', description: 'Academic year (4-digit)' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'academicYear must be a 4-digit year string e.g. "2026"' })
  academicYear: string;
}
