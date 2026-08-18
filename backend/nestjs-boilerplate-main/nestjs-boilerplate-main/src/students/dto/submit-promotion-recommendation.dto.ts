import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PromotionRecommendationOutcome } from '../entities/promotion-recommendation.entity';

export class SubmitPromotionRecommendationDto {
  @IsUUID('4')
  studentId: string;

  @IsString()
  @Length(4, 4)
  academicYear: string;

  @IsEnum(PromotionRecommendationOutcome)
  outcome: PromotionRecommendationOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
