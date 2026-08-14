import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateArtActivityDto {
  @IsInt()
  @Min(1)
  classSectionId: number;

  @IsDateString()
  activityDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;
}
