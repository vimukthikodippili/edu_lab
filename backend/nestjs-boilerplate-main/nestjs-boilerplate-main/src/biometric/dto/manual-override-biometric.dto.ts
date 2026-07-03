import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ManualOverrideBiometricDto {
  @ApiProperty({
    example: 'Fingerprint scanner hardware failure; guardian identity confirmed by NIC card',
    description: 'Reason the security officer is overriding the biometric failure',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    example: '199512345678',
    description: 'Secondary ID number (NIC, passport, staff card) checked in person',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  secondaryIdNumber: string;
}
