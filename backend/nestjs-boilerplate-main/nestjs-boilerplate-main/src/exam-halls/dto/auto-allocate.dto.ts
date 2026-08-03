import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AutoAllocateDto {
  @ApiProperty({ example: true, description: 'Interleave students from different class sections before filling seats' })
  @IsBoolean()
  mixClasses: boolean;

  @ApiPropertyOptional({ description: 'Students to prioritize for front-row/aisle seating', type: [String] })
  @IsOptional()
  @IsUUID('4', { each: true })
  specialNeedsStudentIds?: string[];
}
