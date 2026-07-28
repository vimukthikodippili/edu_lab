import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class NotifyGuardianDto {
  @ApiPropertyOptional({
    maxLength: 200,
    example: 'Please give me a call whenever convenient.',
    description: 'Optional plain-language note, appended to the fixed non-clinical template.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
