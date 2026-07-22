import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateRecurringLabBookingDto {
  @ApiProperty()
  @IsInt()
  classSectionId: number;

  @ApiProperty()
  @IsUUID('4')
  subjectId: string;

  @ApiProperty({ description: '1=Mon .. 6=Sat, matching TimetableEntryEntity.day', example: 1 })
  @IsInt()
  @Min(1)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  periodNumber: number;

  @ApiProperty({ description: 'The academic term whose date range bounds the recurring bookings' })
  @IsInt()
  termId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timetableEntryId?: number;

  @ApiPropertyOptional({ example: 'Weekly Chemistry practical — Grade 11' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  purpose?: string;
}
