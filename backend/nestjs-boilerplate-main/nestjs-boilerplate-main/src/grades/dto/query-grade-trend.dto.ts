import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID } from 'class-validator';

export class QueryGradeTrendDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  classSectionId: number;

  @ApiProperty({ example: 'uuid-of-subject' })
  @IsUUID()
  subjectId: string;
}
