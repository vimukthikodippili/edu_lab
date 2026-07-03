import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class EnrollBiometricDto {
  @ApiProperty({
    enum: ['fingerprint', 'facial', 'both'],
    example: 'fingerprint',
    description:
      'Which biometric modality the template encodes. ' +
      'When "both", pass a JSON-stringified object: {"fingerprint":"...","facial":"..."}.',
  })
  @IsEnum(['fingerprint', 'facial', 'both'])
  templateType: 'fingerprint' | 'facial' | 'both';

  @ApiProperty({
    example: 'BASE64_SDK_PAYLOAD',
    description:
      'Opaque template string from the capture device or simulation. ' +
      'Stored AES-256-GCM encrypted at rest. Never returned by any API endpoint.',
  })
  @IsString()
  @IsNotEmpty()
  template: string;
}
