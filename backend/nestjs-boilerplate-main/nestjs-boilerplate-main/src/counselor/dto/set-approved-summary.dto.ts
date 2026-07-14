import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetApprovedSummaryDto {
  // Omit or send null to un-share (removes guardian visibility for this note).
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string | null;
}
