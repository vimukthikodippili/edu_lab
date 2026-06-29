import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReplaceEnrollmentsDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsUUID('4', { each: true })
  subjectIds: string[];
}
