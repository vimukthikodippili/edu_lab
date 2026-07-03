import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmergencyAlertDto {
  @ApiProperty({ example: 'Fire drill — all students evacuate immediately via the main gate.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}
