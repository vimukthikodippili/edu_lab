import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { TeacherTasksService } from './teacher-tasks.service';

@ApiTags('Teacher Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'teacher-tasks', version: '1' })
export class TeacherTasksController {
  constructor(
    private readonly teacherTasksService: TeacherTasksService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new Error('User email not found');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new Error('Staff record not found for this user');
    return staff.id;
  }

  @Get('free-period')
  @Roles(RoleEnum.admin, RoleEnum.teacher)
  async getFreePeriodStatus(@Request() req: { user: { id: string } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.teacherTasksService.getFreePeriodStatus(staffId);
  }
}
