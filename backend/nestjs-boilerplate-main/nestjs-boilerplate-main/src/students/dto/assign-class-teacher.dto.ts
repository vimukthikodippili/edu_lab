import { IsOptional, IsUUID } from 'class-validator';

export class AssignClassTeacherDto {
  @IsOptional()
  @IsUUID('4')
  staffId: string | null;
}
