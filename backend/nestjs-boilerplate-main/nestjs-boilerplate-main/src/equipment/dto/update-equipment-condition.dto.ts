import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { EquipmentCondition } from '../entities/equipment.entity';
import { EQUIPMENT_CONDITIONS } from './create-equipment.dto';

export class UpdateEquipmentConditionDto {
  @ApiProperty({ example: 'fair', enum: EQUIPMENT_CONDITIONS })
  @IsIn(EQUIPMENT_CONDITIONS)
  condition: EquipmentCondition;
}
