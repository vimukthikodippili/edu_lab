import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '../entities/attendance-record.entity';

export class AttendanceEntryDto {
  @IsUUID()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkMarkAttendanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classSectionId: number;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  defaultStatus: AttendanceStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  overrideReason?: string;
}
