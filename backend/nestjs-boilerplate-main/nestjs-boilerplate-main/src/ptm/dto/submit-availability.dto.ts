import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class SubmitAvailabilityDto {
  @ApiProperty({ example: '13:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime: string;
}
