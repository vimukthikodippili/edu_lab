import { IsInt, IsUUID, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CopyFromYearDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId: number;

  @ApiProperty({ example: '2025', description: 'Year to copy units FROM' })
  @Matches(/^\d{4}$/, { message: 'sourceYear must be a 4-digit year string' })
  sourceYear: string;

  @ApiProperty({ example: '2026', description: 'Year to copy units INTO (must have 0 existing units)' })
  @Matches(/^\d{4}$/, { message: 'targetYear must be a 4-digit year string' })
  targetYear: string;
}
