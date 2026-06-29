import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateRequirementDto {
  @IsUUID('4')
  teacherId: string;

  @IsUUID('4')
  subjectId: string;

  @IsInt()
  @Min(1)
  classSectionId: number;

  @IsInt()
  @Min(1)
  @Max(40)
  periodsPerWeek: number;
}
