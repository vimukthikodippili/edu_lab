import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsUUID } from 'class-validator';

export class RecipientCriteriaDto {
  @ApiPropertyOptional({ example: false, description: 'Every non-blacklisted guardian, ignoring grade/section/individual selection' })
  @IsOptional()
  @IsBoolean()
  allParents?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Every teacher, ignoring grade/section/individual selection' })
  @IsOptional()
  @IsBoolean()
  allTeachers?: boolean;

  @ApiPropertyOptional({ example: [10, 11] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  gradeIds?: number[];

  @ApiPropertyOptional({ example: [3, 4] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  classSectionIds?: number[];

  @ApiPropertyOptional({ example: ['uuid-of-guardian'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  guardianIds?: string[];

  @ApiPropertyOptional({ example: ['uuid-of-staff'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  staffIds?: string[];
}
