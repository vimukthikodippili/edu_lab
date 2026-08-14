import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideMarkCorrectionRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  decisionNote?: string;
}
