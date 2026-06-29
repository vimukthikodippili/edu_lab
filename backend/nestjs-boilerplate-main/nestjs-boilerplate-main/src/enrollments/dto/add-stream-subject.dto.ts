import { IsUUID } from 'class-validator';

export class AddStreamSubjectDto {
  @IsUUID('4')
  subjectId: string;
}
