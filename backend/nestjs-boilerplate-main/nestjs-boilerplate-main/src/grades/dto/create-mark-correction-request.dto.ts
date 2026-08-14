import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateMarkCorrectionRequestDto {
  @IsNumber()
  @Min(0)
  correctedScore: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
