import { IsEmail, IsOptional, MinLength } from 'class-validator';

export class LinkUserAccountDto {
  @IsOptional()
  @IsEmail()
  email: string | null;

  /**
   * Optional. If set and no user exists with `email` yet, a new student-role
   * login account is created (using this student's own name) and linked in
   * the same step. If omitted, only an already-existing account can be linked.
   */
  @IsOptional()
  @MinLength(6)
  password?: string;
}
