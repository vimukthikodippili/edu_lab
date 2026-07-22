import { IsUUID } from 'class-validator';

export class QuerySubjectTopicsDto {
  @IsUUID()
  subjectId: string;
}
