import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBehavioralObservationDto {
  @IsUUID('4')
  studentId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  notes: string;
}
