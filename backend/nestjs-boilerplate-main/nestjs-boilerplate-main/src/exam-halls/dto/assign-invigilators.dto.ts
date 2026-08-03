import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsUUID } from 'class-validator';

export class AssignInvigilatorsDto {
  @ApiProperty({ description: 'One or more staff members to assign as invigilators for this hall', type: [String] })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  staffIds: string[];
}
