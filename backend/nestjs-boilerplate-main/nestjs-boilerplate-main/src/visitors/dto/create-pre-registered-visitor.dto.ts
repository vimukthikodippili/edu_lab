import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { VisitorIdType, VisitorType } from '../entities/visitor.entity';

export class CreatePreRegisteredVisitorDto {
  @ApiProperty({ example: 'Dr. Anoma Wickramasinghe' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '881234567V' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ enum: VisitorIdType })
  @IsOptional()
  @IsEnum(VisitorIdType)
  idType?: VisitorIdType;

  @ApiProperty({ enum: VisitorType, example: VisitorType.PARENT })
  @IsEnum(VisitorType)
  visitorType: VisitorType;

  @ApiProperty({ example: 'Meeting about Grade 9 science fair project' })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsDateString()
  expectedDate: string;

  @ApiProperty({ description: 'The staff member this visitor will be meeting' })
  @IsUUID('4')
  hostStaffId: string;
}
