import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class MonthEndSummaryQueryDto {
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

  @ApiPropertyOptional({ example: 6, description: 'Lowest grade level to include (1-13)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(13)
  gradeFrom?: number;

  @ApiPropertyOptional({ example: 9, description: 'Highest grade level to include (1-13)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(13)
  gradeTo?: number;
}
