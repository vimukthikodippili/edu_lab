import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideFeeWaiverRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
