import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MaterialsCheckEntryDto {
  @IsUUID()
  studentId: string;

  @IsBoolean()
  hasFullMaterials: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkMaterialsCheckDto {
  @IsUUID()
  assessmentId: string;

  @IsBoolean()
  defaultHasFullMaterials: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialsCheckEntryDto)
  entries: MaterialsCheckEntryDto[];
}
