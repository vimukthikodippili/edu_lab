import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'MAT', description: 'Unique subject code (letters, numbers, hyphens, underscores)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9\-_]+$/, {
    message: 'code must contain only letters, numbers, hyphens, or underscores',
  })
  code: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Core mathematics covering algebra, geometry, and statistics' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 1, description: 'ID of the subject category' })
  @IsInt()
  @Min(1)
  categoryId: number;
}
