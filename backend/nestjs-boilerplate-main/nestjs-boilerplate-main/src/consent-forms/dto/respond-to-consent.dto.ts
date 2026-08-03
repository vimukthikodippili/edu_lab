import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConsentResponseType } from '../entities/consent-response.entity';

export class RespondToConsentDto {
  @ApiProperty({ description: 'The child this response is for' })
  @IsUUID('4')
  studentId: string;

  @ApiProperty({ enum: ConsentResponseType, example: ConsentResponseType.SIGNED })
  @IsEnum(ConsentResponseType)
  response: ConsentResponseType;

  @ApiPropertyOptional({ example: 'Clashes with a medical appointment.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
