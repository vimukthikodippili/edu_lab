import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignStreamDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  streamId: number | null;
}
