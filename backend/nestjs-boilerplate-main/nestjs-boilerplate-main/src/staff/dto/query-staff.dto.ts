import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StaffFunctionalRole } from '../entities/staff-role-assignment.entity';
import { StaffStatus } from '../entities/staff.entity';

export class QueryStaffDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'Nimal', description: 'Full-text search across name, designation, department, email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Mathematics', description: 'Exact department match' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Senior Teacher', description: 'Partial designation match' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ enum: StaffFunctionalRole, description: 'Filter by a specific functional role' })
  @IsOptional()
  @IsEnum(StaffFunctionalRole)
  functionalRole?: StaffFunctionalRole;

  @ApiPropertyOptional({ enum: StaffStatus })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}
