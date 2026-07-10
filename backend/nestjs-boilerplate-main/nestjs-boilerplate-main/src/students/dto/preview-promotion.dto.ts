import { IsString, Length } from 'class-validator';

export class PreviewPromotionQueryDto {
  @IsString()
  @Length(4, 4)
  sourceAcademicYear: string;

  @IsString()
  @Length(4, 4)
  targetAcademicYear: string;
}
