import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTermAssessmentPlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  requiredAssessmentCount: number;
}
