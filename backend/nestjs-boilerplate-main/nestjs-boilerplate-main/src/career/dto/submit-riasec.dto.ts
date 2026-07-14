import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { QuestionAnswerDto } from './question-answer.dto';

export class SubmitRiasecDto {
  @IsUUID('4')
  assessmentId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionAnswerDto)
  answers: QuestionAnswerDto[];
}
