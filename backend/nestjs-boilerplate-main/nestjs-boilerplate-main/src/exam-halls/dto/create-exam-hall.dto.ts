import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateExamHallDto {
  @ApiProperty({ example: 'Main Hall' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Administration Block' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ example: 'Ground Floor' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiProperty({ example: 10, description: 'Number of seat rows (A, B, C…)' })
  @IsInt()
  @Min(1)
  rowCount: number;

  @ApiProperty({ example: 6, description: 'Number of seats per row' })
  @IsInt()
  @Min(1)
  columnCount: number;
}
