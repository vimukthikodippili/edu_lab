import { IsInt, Min } from 'class-validator';

export class TransferSectionDto {
  @IsInt()
  @Min(1)
  classSectionId: number;
}
