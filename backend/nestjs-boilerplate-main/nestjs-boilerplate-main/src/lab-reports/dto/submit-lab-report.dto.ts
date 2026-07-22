import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitLabReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}
