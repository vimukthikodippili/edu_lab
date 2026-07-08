import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { GradeTrendService } from '../services/grade-trend.service';
import { QueryGradeTrendDto } from '../dto/query-grade-trend.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Trends')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/grade-trends', version: '1' })
export class GradeTrendController {
  constructor(
    private readonly gradeTrendService: GradeTrendService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff)
      throw new UnprocessableEntityException(
        'No staff record linked to your account.',
      );
    return staff.id;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Get()
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @ApiOperation({
    summary:
      'Get declining grade trend flags + score-over-time series for every student in a class/subject',
  })
  async getClassSubjectTrends(
    @Query() query: QueryGradeTrendDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.gradeTrendService.getClassSubjectTrends(
      query.classSectionId,
      query.subjectId,
      staffId,
      this.isPrivileged(req),
    );
  }
}
