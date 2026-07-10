import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { EnrollmentOutcome } from '../entities/student-enrollment-history.entity';

export class CommitPromotionEntryDto {
  @IsUUID('4')
  studentId: string;

  @IsString()
  @Length(4, 4)
  targetAcademicYear: string;

  @IsEnum(EnrollmentOutcome)
  outcome: EnrollmentOutcome;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetGradeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetClassSectionId?: number;
}

export class CommitPromotionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommitPromotionEntryDto)
  entries: CommitPromotionEntryDto[];
}
