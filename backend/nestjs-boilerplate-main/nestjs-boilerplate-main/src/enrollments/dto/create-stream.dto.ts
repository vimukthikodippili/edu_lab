import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStreamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
