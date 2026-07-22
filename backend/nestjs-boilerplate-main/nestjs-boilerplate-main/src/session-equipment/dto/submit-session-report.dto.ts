import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SessionUsageItemDto {
  @ApiProperty()
  @IsUUID('4')
  equipmentId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantityUsed: number;
}

export class DamageReportItemDto {
  @ApiProperty()
  @IsUUID('4')
  equipmentId: string;

  @ApiProperty({ enum: ['damaged', 'missing'] })
  @IsIn(['damaged', 'missing'])
  reportType: 'damaged' | 'missing';

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  responsibleStudentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class SubmitSessionReportDto {
  @ApiPropertyOptional({ type: [SessionUsageItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMaxSize(200)
  @Type(() => SessionUsageItemDto)
  usage?: SessionUsageItemDto[];

  @ApiPropertyOptional({ type: [DamageReportItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMaxSize(200)
  @Type(() => DamageReportItemDto)
  damage?: DamageReportItemDto[];
}
