import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { StaffFunctionalRole } from '../entities/staff-role-assignment.entity';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nimal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Perera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Senior Teacher' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  designation: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department: string;

  @ApiProperty({ example: '2020-01-15', description: 'ISO date YYYY-MM-DD' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: 'nimal.perera@school.edu.lk' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: '0771234567', description: 'Sri Lankan phone number' })
  @Matches(/^(\+94|0)[0-9]{9}$/, {
    message: 'phone must be a valid Sri Lankan number (e.g. 0771234567 or +94771234567)',
  })
  phone: string;

  @ApiProperty({ example: '987654321V' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  nicNumber: string;

  @ApiPropertyOptional({ example: 'No. 12, Temple Road, Kandy' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    example: ['BSc in Education', 'PGDE'],
    description: 'Array of qualification strings',
  })
  @IsArray()
  @IsString({ each: true })
  qualifications: string[];

  @ApiProperty({
    example: ['subject_teacher', 'sports_coach'],
    description: 'At least one functional role required',
    enum: StaffFunctionalRole,
    isArray: true,
  })
  @IsArray()
  @IsEnum(StaffFunctionalRole, { each: true, message: 'Each role must be a valid StaffFunctionalRole' })
  @ArrayMinSize(1, { message: 'At least one role must be assigned.' })
  roles: StaffFunctionalRole[];

  @ApiPropertyOptional({
    example: 'uuid-of-uploaded-photo',
    description: 'UUID of a previously-uploaded photo file',
  })
  @IsOptional()
  @IsUUID('4', { message: 'photoId must be a valid UUID' })
  photoId?: string;
}
