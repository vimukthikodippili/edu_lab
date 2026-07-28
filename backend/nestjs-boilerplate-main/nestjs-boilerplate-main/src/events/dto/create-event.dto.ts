import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ example: 'Annual Sports Day 2026' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: EventType, example: EventType.SPORTS_DAY })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '08:00' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '13:00' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'Main School Grounds' })
  @IsNotEmpty()
  @IsString()
  venue: string;

  @ApiPropertyOptional({ example: 'Annual inter-house sports meet.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 200 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 2, description: 'Max tickets one guardian (family) may hold for this event' })
  @IsInt()
  @Min(1)
  ticketsPerFamily: number;
}
