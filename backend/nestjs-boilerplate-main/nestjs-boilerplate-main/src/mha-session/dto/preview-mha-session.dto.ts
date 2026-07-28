import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class PreviewMhaSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID('4')
  studentId: string;

  @ApiPropertyOptional({ description: 'Defaults to today if omitted', example: '2026-07-23' })
  @IsOptional()
  @IsDateString()
  screeningDate?: string;
}
