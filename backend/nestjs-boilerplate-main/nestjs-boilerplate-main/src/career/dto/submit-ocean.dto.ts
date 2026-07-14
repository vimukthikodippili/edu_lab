import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { QuestionAnswerDto } from './question-answer.dto';

export class SubmitOceanDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionAnswerDto)
  answers: QuestionAnswerDto[];
}
