import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleLabMaintenanceDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isUnderMaintenance: boolean;
}
