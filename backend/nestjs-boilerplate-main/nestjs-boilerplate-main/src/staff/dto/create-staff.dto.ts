import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StaffFunctionalRole } from '../entities/staff-role-assignment.entity';
import { PORTAL_ROLE_IDS } from './change-system-role.dto';
import { RoleEnum } from '../../roles/roles.enum';

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

  @ApiPropertyOptional({
    example: ['uuid-of-cert-1', 'uuid-of-diploma-1'],
    description: 'UUIDs of previously-uploaded qualification document files',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each qualificationDocId must be a valid UUID' })
  qualificationDocIds?: string[];

  @ApiPropertyOptional({
    example: RoleEnum.teacher,
    description: 'Portal login role to provision for this staff member: 5=teacher (default), 4=section_head',
    enum: PORTAL_ROLE_IDS,
  })
  @IsOptional()
  @IsIn(PORTAL_ROLE_IDS, { message: 'systemRoleId must be 4 (section_head) or 5 (teacher)' })
  systemRoleId?: RoleEnum;

  @ApiPropertyOptional({
    example: 'Welcome@123',
    description: 'Initial portal login password. Defaults to the staff NIC number if omitted.',
    minLength: 6,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Initial password must be at least 6 characters.' })
  @MaxLength(128)
  initialPassword?: string;
}
