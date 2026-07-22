import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateLabDto {
  @ApiProperty({ example: 'Chemistry Lab 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'uuid-of-lab-type' })
  @IsUUID()
  labTypeId: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 'S-101' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  roomNumber: string;

  @ApiProperty({ example: 'uuid-of-staff' })
  @IsUUID()
  labInChargeId: string;
}
