import { IsInt, Max, Min } from 'class-validator';

export class UpdateRequirementDto {
  @IsInt()
  @Min(1)
  @Max(40)
  periodsPerWeek: number;
}
