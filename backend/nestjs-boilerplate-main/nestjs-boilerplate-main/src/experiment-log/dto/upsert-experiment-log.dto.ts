import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpsertExperimentLogDto {
  @ApiProperty({ example: 'Titration of HCl with NaOH' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  experimentName: string;

  @ApiProperty({ example: 'Determine the concentration of an unknown HCl solution.' })
  @IsNotEmpty()
  @IsString()
  objective: string;

  @ApiProperty({ example: 'Added phenolphthalein indicator, titrated NaOH into 25ml HCl until colour change.' })
  @IsNotEmpty()
  @IsString()
  procedureSummary: string;

  @ApiProperty({ example: 'Endpoint reached at 22.4ml — concentration calculated as 0.09M.' })
  @IsNotEmpty()
  @IsString()
  outcome: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentFileIds?: string[];
}
