import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class WriteOffEquipmentDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Broken during Grade 10 practical — glass beaker shattered' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
