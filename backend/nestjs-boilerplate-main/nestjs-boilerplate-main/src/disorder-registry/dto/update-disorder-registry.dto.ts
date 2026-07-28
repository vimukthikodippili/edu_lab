import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDisorderRegistryDto } from './create-disorder-registry.dto';

export class UpdateDisorderRegistryDto extends PartialType(CreateDisorderRegistryDto) {
  @ApiPropertyOptional({ description: 'Deactivate (false) or reactivate (true) this domain' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
