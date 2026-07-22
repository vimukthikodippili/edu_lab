import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RecipientCriteriaDto } from './recipient-criteria.dto';

export class SendTargetedMessageDto extends RecipientCriteriaDto {
  @ApiProperty({ example: 'Sports Day rescheduled' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: "Sports Day has been moved to next Friday due to weather." })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  channelSms: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  channelEmail: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  channelPush: boolean;
}
