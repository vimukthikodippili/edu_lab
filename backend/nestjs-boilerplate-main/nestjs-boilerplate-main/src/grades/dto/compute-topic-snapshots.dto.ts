import { IsInt, Min } from 'class-validator';

export class ComputeTopicSnapshotsDto {
  @IsInt()
  @Min(1)
  termId: number;
}
