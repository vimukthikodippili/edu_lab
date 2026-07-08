import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderSyllabusUnitsDto {
  @ApiProperty({
    description: 'Ordered array of unit UUIDs — backend assigns order = index + 1',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  unitIds: string[];
}
