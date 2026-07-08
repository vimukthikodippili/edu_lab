import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class QueryMonthlyPlanDto {
  @ApiPropertyOptional({ example: 'uuid-of-subject' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeId?: number;

  @ApiProperty({ example: '2026' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'academicYear must be a 4-digit year' })
  academicYear: string;

  @ApiProperty({ example: 7, description: 'Month number, 1-12' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
