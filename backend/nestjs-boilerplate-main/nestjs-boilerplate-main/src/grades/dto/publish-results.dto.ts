import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class PublishResultsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  classSectionId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;
}
