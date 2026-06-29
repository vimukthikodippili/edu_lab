import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum } from 'class-validator';
import { StaffFunctionalRole } from '../entities/staff-role-assignment.entity';

/** Atomically replaces the complete set of functional roles for a staff member. */
export class UpdateStaffRolesDto {
  @ApiProperty({
    example: ['class_teacher'],
    description: 'Complete replacement role list — all existing roles are cleared and replaced.',
    enum: StaffFunctionalRole,
    isArray: true,
  })
  @IsArray()
  @IsEnum(StaffFunctionalRole, { each: true, message: 'Each role must be a valid StaffFunctionalRole' })
  @ArrayMinSize(1, { message: 'At least one role must remain assigned.' })
  roles: StaffFunctionalRole[];
}
