import { ArrayMinSize, IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class SubmitSubjectSelectionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  streamId?: number | null;

  @IsArray()
  @ArrayMinSize(0)
  @IsUUID('4', { each: true })
  optionalSubjectIds: string[];
}
