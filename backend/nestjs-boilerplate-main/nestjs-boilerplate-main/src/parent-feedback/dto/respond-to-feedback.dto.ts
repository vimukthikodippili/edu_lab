import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RespondToFeedbackDto {
  @ApiProperty({ example: 'Thank you for flagging this — we have spoken to the canteen vendor and food will now be served hot.' })
  @IsNotEmpty()
  @IsString()
  responseBody: string;
}
