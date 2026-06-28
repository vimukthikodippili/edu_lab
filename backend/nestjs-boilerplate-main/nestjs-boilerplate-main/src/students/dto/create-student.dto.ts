import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StudentGender } from '../entities/student.entity';
import { CreateGuardianDto } from './create-guardian.dto';

export class CreateStudentDto {
  @ApiProperty({ example: 'Kasun' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Bandara' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '2012-04-15', description: 'ISO date string YYYY-MM-DD' })
  @IsNotEmpty()
  @IsDateString({}, { message: 'dateOfBirth must be a valid ISO date (YYYY-MM-DD)' })
  dateOfBirth: string;

  @ApiProperty({ enum: StudentGender, example: StudentGender.MALE })
  @IsNotEmpty()
  @IsEnum(StudentGender, {
    message: `gender must be one of: ${Object.values(StudentGender).join(', ')}`,
  })
  gender: StudentGender;

  @ApiPropertyOptional({ example: '123 Kandy Road, Peradeniya' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: '0771234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNumber?: string;

  @ApiPropertyOptional({ example: '200212345678' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  nicNumber?: string;

  @ApiPropertyOptional({ example: 'Mild peanut allergy. Carries EpiPen.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medicalNotes?: string;

  @ApiProperty({ example: 6, description: 'Grade entity ID (1–13 correspond to grade levels)' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(13)
  @Type(() => Number)
  gradeId: number;

  @ApiProperty({ example: 1, description: 'ClassSection entity ID' })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  classSectionId: number;

  @ApiProperty({
    type: [CreateGuardianDto],
    description: 'At least one guardian is required before enrollment is complete.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one guardian must be linked before enrollment is complete.' })
  @ValidateNested({ each: true })
  @Type(() => CreateGuardianDto)
  guardians: CreateGuardianDto[];

  @ApiPropertyOptional({ example: 'uuid-of-uploaded-file' })
  @IsOptional()
  @IsUUID('4', { message: 'photoId must be a valid UUID' })
  photoId?: string;
}
