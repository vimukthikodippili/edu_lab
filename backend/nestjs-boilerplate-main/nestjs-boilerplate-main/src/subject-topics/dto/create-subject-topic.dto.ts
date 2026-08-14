import { IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateSubjectTopicDto {
  @IsUUID()
  subjectId: string;

  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  /** Only honored for a privileged caller — see QuerySubjectTopicsDto.teacherId. */
  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
