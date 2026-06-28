import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { GuardianRelationship } from '../entities/guardian.entity';

export class CreateGuardianDto {
  @ApiProperty({ example: 'Sunethra' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Perera' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ enum: GuardianRelationship, example: GuardianRelationship.MOTHER })
  @IsNotEmpty()
  @IsEnum(GuardianRelationship, {
    message: `relationship must be one of: ${Object.values(GuardianRelationship).join(', ')}`,
  })
  relationship: GuardianRelationship;

  @ApiProperty({ example: '987654321V' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(12)
  nic: string;

  @ApiProperty({ example: '0771234567' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^(\+94|0)[0-9]{9}$/, {
    message: 'phone must be a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567)',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'sunethra@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Colombo 05' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
