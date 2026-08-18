import { IsString, Length } from 'class-validator';

export class QueryPromotionRecommendationsDto {
  @IsString()
  @Length(4, 4)
  academicYear: string;
}
