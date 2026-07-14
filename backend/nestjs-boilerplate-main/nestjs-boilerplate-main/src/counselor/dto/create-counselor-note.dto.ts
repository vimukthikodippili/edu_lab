import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCounselorNoteDto {
  @IsUUID('4')
  studentId: string;

  @IsOptional()
  @IsUUID('4')
  caseId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  notes: string;
}
