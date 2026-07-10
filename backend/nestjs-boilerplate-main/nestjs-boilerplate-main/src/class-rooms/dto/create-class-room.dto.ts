import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClassRoomDto {
  @ApiProperty({ example: 'Room 5' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomNumber: string;
}
