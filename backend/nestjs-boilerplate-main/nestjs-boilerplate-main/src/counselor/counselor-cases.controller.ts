import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { CounselorCaseService } from './counselor-case.service';
import { CounselorCaseStatus } from './entities/counselor-case.entity';

@ApiTags('Counselor Cases')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'counselor-cases', version: '1' })
export class CounselorCasesController {
  constructor(
    private readonly caseService: CounselorCaseService,
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

  @Get()
  @Roles(RoleEnum.principal, RoleEnum.counselor)
  @HttpCode(HttpStatus.OK)
  async findCases(@Query('status') status?: CounselorCaseStatus) {
    return this.caseService.findCases(status);
  }

  @Patch(':id/close')
  @Roles(RoleEnum.counselor, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async closeCase(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.caseService.closeCase(id, staffId);
  }
}
