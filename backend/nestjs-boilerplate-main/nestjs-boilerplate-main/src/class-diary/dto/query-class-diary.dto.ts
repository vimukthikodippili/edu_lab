import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class QueryClassDiaryDto {
  @ApiProperty({ example: '2026-07-06' })
  @IsDateString()
  date: string;
}
