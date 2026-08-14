import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsUUID, ValidateNested } from 'class-validator';
import { ART_PALETTE_COLORS } from '../entities/art-activity-student-check.entity';

export class PostCheckEntryDto {
  @IsUUID()
  studentId: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(ART_PALETTE_COLORS, { each: true })
  colorsUsed: string[];
}

export class BulkPostCheckDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostCheckEntryDto)
  entries: PostCheckEntryDto[];
}
