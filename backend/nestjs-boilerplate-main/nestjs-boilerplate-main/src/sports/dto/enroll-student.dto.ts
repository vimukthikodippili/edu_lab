import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EnrollStudentDto {
  @ApiProperty({ example: 'uuid-of-student' })
  @IsUUID()
  studentId: string;
}
