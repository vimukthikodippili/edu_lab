import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class QueryTopicWeaknessDto {
  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 'uuid-of-subject' })
  @IsUUID()
  subjectId: string;
}
