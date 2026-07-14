import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class AttachWhiteboardSnapshotDto {
  @ApiProperty()
  @IsUUID('4')
  imageFileId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  pdfFileId?: string;
}
