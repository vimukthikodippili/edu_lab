import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateGradeStageDto {
  @ApiProperty({ example: 'Primary' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  stageName: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(13)
  fromGrade: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(13)
  toGrade: number;
}
