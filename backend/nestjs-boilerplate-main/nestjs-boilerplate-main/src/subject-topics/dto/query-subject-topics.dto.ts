import { IsOptional, IsUUID } from 'class-validator';

export class QuerySubjectTopicsDto {
  @IsUUID()
  subjectId: string;

  /** Only honored for a privileged caller (e.g. a Section Head scheduling an assessment on a
   * teacher's behalf) — lets them view that teacher's own topic list instead of their own. */
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
