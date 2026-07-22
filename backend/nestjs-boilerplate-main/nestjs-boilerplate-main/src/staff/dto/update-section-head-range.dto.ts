import { IsInt, Max, Min } from 'class-validator';

export class UpdateSectionHeadRangeDto {
  @IsInt()
  @Min(1)
  @Max(13)
  sectionHeadGradeFrom: number;

  @IsInt()
  @Min(1)
  @Max(13)
  sectionHeadGradeTo: number;
}
