import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';
import { ExamType } from '../entities/exam.entity';

export class CreateExamDto {
  @ApiProperty({ example: 'O/L Sinhala Language 2026' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ExamType, example: ExamType.O_LEVEL })
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiProperty({ description: 'The subject sat in this exam sitting' })
  @IsUUID('4')
  subjectId: string;

  @ApiProperty({ description: 'The whole grade cohort sitting this exam' })
  @IsInt()
  @Min(1)
  gradeId: number;

  @ApiProperty({ example: '2026-12-05' })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ example: '08:30' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '11:30' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ example: '2026' })
  @IsNotEmpty()
  @IsString()
  academicYear: string;
}
