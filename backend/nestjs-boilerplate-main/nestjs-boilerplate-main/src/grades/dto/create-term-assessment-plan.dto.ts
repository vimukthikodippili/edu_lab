import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTermAssessmentPlanDto {
  @IsUUID()
  subjectId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  termId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  requiredAssessmentCount: number;
}
