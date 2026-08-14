import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsUUID, ValidateNested } from 'class-validator';

export class PreCheckEntryDto {
  @IsUUID()
  studentId: string;

  @IsBoolean()
  hasAllColors: boolean;
}

export class BulkPreCheckDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreCheckEntryDto)
  entries: PreCheckEntryDto[];
}
