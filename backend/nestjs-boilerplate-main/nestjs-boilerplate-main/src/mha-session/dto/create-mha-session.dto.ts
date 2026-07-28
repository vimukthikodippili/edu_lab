import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateMhaSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID('4')
  studentId: string;

  @ApiProperty({ example: '2026-07-23' })
  @IsDateString()
  screeningDate: string;
}
