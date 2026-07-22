import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsUUID } from 'class-validator';

export class ReorderGradeStagesDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2', 'uuid-3', 'uuid-4'] })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds: string[];
}
