import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { EquipmentCondition } from '../entities/equipment.entity';

export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = ['good', 'fair', 'poor'];

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Digital Multimeter' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'uuid-of-equipment-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pieces' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  unit: string;

  @ApiPropertyOptional({ example: 'good', enum: EQUIPMENT_CONDITIONS })
  @IsOptional()
  @IsIn(EQUIPMENT_CONDITIONS)
  condition?: EquipmentCondition;

  @ApiPropertyOptional({ example: 'SN-2026-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  purchaseDate: string;

  @ApiPropertyOptional({ example: 5, description: 'Presence marks this item as a tracked consumable for low-stock alerts' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;
}
