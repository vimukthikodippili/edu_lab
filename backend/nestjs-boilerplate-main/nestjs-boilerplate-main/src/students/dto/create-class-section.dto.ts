import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateClassSectionDto {
  @IsInt()
  @Min(1)
  gradeId: number;

  @IsString()
  @Length(1, 10)
  name: string; // e.g. "A", "B", "Science"

  @IsString()
  @Length(4, 4)
  academicYear: string; // e.g. "2026"
}
