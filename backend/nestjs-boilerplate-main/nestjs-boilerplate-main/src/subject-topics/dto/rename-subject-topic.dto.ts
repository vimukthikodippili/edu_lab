import { IsNotEmpty, MaxLength } from 'class-validator';

export class RenameSubjectTopicDto {
  @IsNotEmpty()
  @MaxLength(120)
  title: string;
}
