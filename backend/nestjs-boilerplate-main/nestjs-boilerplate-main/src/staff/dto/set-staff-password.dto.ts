import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetStaffPasswordDto {
  @ApiProperty({ example: 'NewSecurePass123', minLength: 6, maxLength: 128 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters.' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters.' })
  newPassword: string;
}
