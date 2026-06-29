import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FinalizeTimetableDto {
  @ApiProperty({ example: '2026', description: 'Four-digit academic year to finalize' })
  @IsString()
  @Length(4, 4)
  academicYear: string;
}
