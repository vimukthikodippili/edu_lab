import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateTimetableEntryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  day?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  period?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  roomNumber?: string | null;
}
