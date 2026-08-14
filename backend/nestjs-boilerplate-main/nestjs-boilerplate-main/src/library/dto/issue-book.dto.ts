import { IsOptional, IsUUID } from 'class-validator';

export class IssueBookDto {
  @IsUUID()
  bookId: string;

  // Exactly one of studentId / staffId must be provided — validated in LibraryService.issueBook(),
  // matching this module's service-level validation convention rather than a custom DTO decorator.
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsUUID()
  @IsOptional()
  staffId?: string;
}
