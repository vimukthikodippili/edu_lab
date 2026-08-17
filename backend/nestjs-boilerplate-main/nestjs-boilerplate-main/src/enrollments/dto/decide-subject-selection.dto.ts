import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideSubjectSelectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reviewNote?: string;
}
