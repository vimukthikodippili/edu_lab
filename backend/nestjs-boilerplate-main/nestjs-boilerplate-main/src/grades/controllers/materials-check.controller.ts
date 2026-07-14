import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { MaterialsCheckService } from '../services/materials-check.service';
import { BulkMaterialsCheckDto } from '../dto/bulk-materials-check.dto';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';

const PRIVILEGED_ROLES = new Set<number>([
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
]);

@ApiTags('Grades — Materials Check')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/materials-check', version: '1' })
export class MaterialsCheckController {
  constructor(
    private readonly materialsCheckService: MaterialsCheckService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  private isPrivileged(req: { user: { role?: { id?: number } } }): boolean {
    const roleId = req.user.role?.id;
    return roleId !== undefined && PRIVILEGED_ROLES.has(roleId);
  }

  @Get(':assessmentId')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Materials-readiness status for a gated assessment, per student' })
  getStatus(@Param('assessmentId') assessmentId: string) {
    return this.materialsCheckService.getStatus(assessmentId);
  }

  @Post('bulk')
  @Roles(RoleEnum.teacher, RoleEnum.section_head, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Class teacher confirms materials readiness for the whole roster before an assessment begins',
  })
  async bulkCheck(
    @Body() dto: BulkMaterialsCheckDto,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.materialsCheckService.bulkCheck(dto, staffId, this.isPrivileged(req));
  }
}
