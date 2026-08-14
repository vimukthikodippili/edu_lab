import { IsString, Length } from 'class-validator';

export class RequestAssessmentChangeDto {
  @IsString()
  @Length(1, 500)
  message: string;
}
