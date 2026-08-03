import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { VisitorIdType, VisitorType } from '../entities/visitor.entity';

export class SignInVisitorDto {
  @ApiProperty({ example: 'W. A. Sunil Perera' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '881234567V' })
  @IsNotEmpty()
  @IsString()
  idNumber: string;

  @ApiProperty({ enum: VisitorIdType, example: VisitorIdType.NIC })
  @IsEnum(VisitorIdType)
  idType: VisitorIdType;

  @ApiProperty({ enum: VisitorType, example: VisitorType.CONTRACTOR })
  @IsEnum(VisitorType)
  visitorType: VisitorType;

  @ApiProperty({ example: 'Repairing the science lab air conditioner' })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiProperty({ description: 'The staff member this visitor is meeting' })
  @IsUUID('4')
  hostStaffId: string;

  @ApiProperty({ example: '2026-08-03T15:00:00.000Z' })
  @IsDateString()
  expectedDepartureTime: string;

  @ApiPropertyOptional({ description: 'UUID of a previously-uploaded photo file' })
  @IsOptional()
  @IsUUID('4')
  photoId?: string;

  @ApiPropertyOptional({ description: 'Pre-registration record this sign-in matches, if any' })
  @IsOptional()
  @IsUUID('4')
  preRegistrationId?: string;
}
