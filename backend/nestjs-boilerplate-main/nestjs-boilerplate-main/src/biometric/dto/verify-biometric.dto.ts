import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class VerifyBiometricDto {
  @ApiProperty({
    example: 'BASE64_SCAN_PAYLOAD',
    description:
      'Opaque template string captured by the gate terminal biometric device. ' +
      'In simulation mode, pass btoa("fingerprint-sim-{guardianId}-{timestamp}").',
  })
  @IsString()
  @IsNotEmpty()
  scanTemplate: string;

  @ApiProperty({ enum: ['fingerprint', 'facial', 'both'] })
  @IsEnum(['fingerprint', 'facial', 'both'])
  templateType: 'fingerprint' | 'facial' | 'both';
}
