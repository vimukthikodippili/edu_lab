import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum LeavingStatus {
  GRADUATED = 'graduated',
  TRANSFERRED = 'transferred',
}

export class MarkAsLeavingDto {
  @IsEnum(LeavingStatus)
  status: LeavingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
