import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class QuestionAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  value: number;
}
