import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePtmEventDto {
  @ApiProperty({ example: 'Term 2 Parent-Teacher Meeting' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ example: 10, description: 'Duration of each slot in minutes' })
  @IsInt()
  @IsPositive()
  slotDurationMinutes: number;

  @ApiPropertyOptional({ example: 24, description: 'How many hours before the meeting a parent may still cancel' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  cancellationCutoffHours?: number;
}
