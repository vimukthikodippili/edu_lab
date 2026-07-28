import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SessionActionStatus } from '../entities/session-action.entity';

export class UpdateSessionActionDto {
  @ApiProperty({ enum: SessionActionStatus, example: SessionActionStatus.COMPLETE })
  @IsEnum(SessionActionStatus)
  status: SessionActionStatus;

  // AC #85 — only meaningful (and only ever applied) on the open->complete transition; ignored
  // otherwise. See RecommendedActionService.updateStatus.
  @ApiPropertyOptional({ example: 'Parent meeting held on 27/07.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  completionNote?: string;
}
