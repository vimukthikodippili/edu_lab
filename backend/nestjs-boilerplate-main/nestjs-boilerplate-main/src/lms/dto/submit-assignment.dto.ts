import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class SubmitAssignmentDto {
  @ApiPropertyOptional({ example: 'I completed all 10 questions, working attached.' })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  textContent?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}
