import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MhaConsentMethod } from '../entities/mha-consent.entity';

export class RecordMhaConsentDto {
  @ApiPropertyOptional({ description: 'An existing linked guardian, if applicable — autofill/traceability only' })
  @IsOptional()
  @IsUUID('4')
  guardianId?: string;

  @ApiProperty({ example: 'Sunethra Perera' })
  @IsNotEmpty()
  @IsString()
  guardianName: string;

  @ApiProperty({ example: '+94 71 234 5678' })
  @IsNotEmpty()
  @IsString()
  guardianContact: string;

  @ApiProperty({ enum: MhaConsentMethod, example: MhaConsentMethod.WRITTEN })
  @IsEnum(MhaConsentMethod)
  method: MhaConsentMethod;

  @ApiPropertyOptional({ description: 'Defaults to now if omitted; set explicitly to backdate a form signed earlier' })
  @IsOptional()
  @IsDateString()
  consentedAt?: string;
}
