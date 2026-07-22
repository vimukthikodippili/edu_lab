import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLabTypeDto {
  @ApiProperty({ example: 'Robotics' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;
}
