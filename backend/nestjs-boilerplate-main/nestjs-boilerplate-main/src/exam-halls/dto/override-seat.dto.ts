import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class OverrideSeatDto {
  @ApiProperty({ description: 'The exam seat to move this student into' })
  @IsUUID('4')
  examSeatId: string;
}
