import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideLeaveRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  decisionNote?: string;
}
