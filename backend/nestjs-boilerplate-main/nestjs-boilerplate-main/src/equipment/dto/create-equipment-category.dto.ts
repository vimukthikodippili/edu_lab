import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEquipmentCategoryDto {
  @ApiProperty({ example: 'uuid-of-lab-type' })
  @IsUUID()
  labTypeId: string;

  @ApiProperty({ example: 'Glassware' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;
}
