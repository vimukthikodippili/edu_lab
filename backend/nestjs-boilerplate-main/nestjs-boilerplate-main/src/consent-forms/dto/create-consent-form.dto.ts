import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ConsentTargetType } from '../entities/consent-form.entity';

export class CreateConsentFormDto {
  @ApiProperty({ example: 'Colombo Museum Field Trip — Grade 8' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Consent for the Grade 8 field trip to the National Museum on 2026-09-12.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ConsentTargetType, example: ConsentTargetType.SPECIFIC_GRADES })
  @IsEnum(ConsentTargetType)
  targetType: ConsentTargetType;

  @ApiPropertyOptional({ example: [8], description: 'Required when targetType is specific_grades' })
  @ValidateIf((o: CreateConsentFormDto) => o.targetType === ConsentTargetType.SPECIFIC_GRADES)
  @IsArray()
  @IsInt({ each: true })
  targetGrades?: number[];

  @ApiPropertyOptional({ example: ['uuid-of-student'], description: 'Required when targetType is specific_students' })
  @ValidateIf((o: CreateConsentFormDto) => o.targetType === ConsentTargetType.SPECIFIC_STUDENTS)
  @IsArray()
  @IsUUID('4', { each: true })
  targetStudentIds?: string[];

  @ApiProperty({ example: '2026-09-05' })
  @IsDateString()
  deadline: string;
}
