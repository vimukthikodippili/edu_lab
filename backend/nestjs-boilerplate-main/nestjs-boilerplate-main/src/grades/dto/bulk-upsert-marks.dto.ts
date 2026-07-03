import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { MarkStatus } from '../entities/mark.entity';

export class MarkEntryDto {
  @IsUUID()
  studentId: string;

  @IsNumber()
  @Min(0)
  score: number;
}

export class BulkUpsertMarksDto {
  @IsUUID()
  assessmentId: string;

  @IsEnum(MarkStatus)
  status: MarkStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  entries: MarkEntryDto[];
}
