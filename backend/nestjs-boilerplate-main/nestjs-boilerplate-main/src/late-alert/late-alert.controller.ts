import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { LateAlertService } from './late-alert.service';
import { QueryLateAlertsDto } from './dto/query-late-alerts.dto';

@ApiTags('Late Alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'late-alerts', version: '1' })
export class LateAlertController {
  constructor(
    private readonly lateAlertService: LateAlertService,
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

  private isFullyPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId === RoleEnum.admin || roleId === RoleEnum.principal;
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async findAlerts(
    @Query() query: QueryLateAlertsDto,
    @Request() req: { user: { id: string; role?: { id?: number } } },
  ) {
    const fullyPrivileged = this.isFullyPrivileged(req);
    const staffId = fullyPrivileged ? null : await this.resolveStaffId(req.user.id);
    return this.lateAlertService.findAlerts(query.acknowledged, staffId);
  }

  @Patch(':id/acknowledge')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async acknowledge(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: string; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.lateAlertService.acknowledge(id, staffId, this.isFullyPrivileged(req));
  }
}
