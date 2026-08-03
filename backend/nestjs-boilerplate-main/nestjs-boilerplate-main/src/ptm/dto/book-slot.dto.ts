import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BookSlotDto {
  @ApiProperty({ description: 'The child this meeting is about' })
  @IsUUID('4')
  studentId: string;
}
