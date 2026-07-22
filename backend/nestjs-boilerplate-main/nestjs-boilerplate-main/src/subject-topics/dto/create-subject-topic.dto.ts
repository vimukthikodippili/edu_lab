import { IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateSubjectTopicDto {
  @IsUUID()
  subjectId: string;

  @IsNotEmpty()
  @MaxLength(120)
  title: string;
}
