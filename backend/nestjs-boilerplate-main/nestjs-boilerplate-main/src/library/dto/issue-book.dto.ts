import { IsUUID } from 'class-validator';

export class IssueBookDto {
  @IsUUID()
  bookId: string;

  @IsUUID()
  studentId: string;
}
