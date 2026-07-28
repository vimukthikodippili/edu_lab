import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RegisterEventDto {
  @ApiPropertyOptional({ description: 'Which of the guardian\'s linked children this registration is for, if applicable' })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}
