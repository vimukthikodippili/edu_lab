import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetBlockedDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isBlocked: boolean;

  @ApiPropertyOptional({ example: 'Attempted unauthorized access to staff areas on a prior visit.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
