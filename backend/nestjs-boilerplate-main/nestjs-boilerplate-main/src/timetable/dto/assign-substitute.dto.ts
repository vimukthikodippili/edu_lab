import { IsUUID } from 'class-validator';

export class AssignSubstituteDto {
  @IsUUID()
  substituteStaffId: string;
}
