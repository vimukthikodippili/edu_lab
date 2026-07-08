import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { TeacherPerformanceService } from './teacher-performance.service';

@ApiTags('Teacher Performance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'teacher-performance', version: '1' })
export class TeacherPerformanceController {
  constructor(
    private readonly teacherPerformanceService: TeacherPerformanceService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveTeacherId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException(
        'No staff record linked to your account email.',
      );
    }
    return staff.id;
  }

  @Get('me')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the caller's own combined performance dashboard" })
  async getMyPerformance(@Request() req: { user: { id: unknown } }) {
    const teacherId = await this.resolveTeacherId(req.user.id);
    return this.teacherPerformanceService.getMyPerformance(teacherId);
  }

  @Get('staff/:staffId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get any teacher's combined performance dashboard (principal/section-head only)" })
  async getStaffPerformance(@Param('staffId') staffId: string) {
    const staff = await this.staffService.findById(staffId);
    const dto = await this.teacherPerformanceService.getPerformanceForStaff(staffId);
    return { teacher: { id: staff.id, firstName: staff.firstName, lastName: staff.lastName }, ...dto };
  }
}
