import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID } from 'class-validator';

export class AddParticipantsDto {
  @ApiPropertyOptional({ description: 'Every active student in these class sections is added as a participant', type: [Number] })
  @IsOptional()
  @IsInt({ each: true })
  classSectionIds?: number[];

  @ApiPropertyOptional({ description: 'Individual students to add as participants, in addition to any class sections above', type: [String] })
  @IsOptional()
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
