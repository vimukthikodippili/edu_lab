import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VisitorIdType } from '../entities/visitor.entity';

export class BlockNewVisitorDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '881234567V' })
  @IsNotEmpty()
  @IsString()
  idNumber: string;

  @ApiProperty({ enum: VisitorIdType, example: VisitorIdType.NIC })
  @IsEnum(VisitorIdType)
  idType: VisitorIdType;

  @ApiPropertyOptional({ example: 'Reported by another school for repeated unauthorized entry.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
