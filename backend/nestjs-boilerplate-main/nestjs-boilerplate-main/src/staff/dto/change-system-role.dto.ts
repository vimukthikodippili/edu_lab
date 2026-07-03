import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { RoleEnum } from '../../roles/roles.enum';

export const PORTAL_ROLE_IDS = [RoleEnum.teacher, RoleEnum.section_head] as const;

export class ChangeSystemRoleDto {
  @ApiProperty({
    example: RoleEnum.section_head,
    description: 'Portal role to assign: 5=teacher, 4=section_head',
    enum: PORTAL_ROLE_IDS,
  })
  @IsIn(PORTAL_ROLE_IDS, { message: 'roleId must be 4 (section_head) or 5 (teacher)' })
  roleId: RoleEnum;
}
