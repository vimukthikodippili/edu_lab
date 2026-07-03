import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { PrincipalService, ApprovalQueueItem } from './principal.service';
import { PrincipalKpiResponse } from './dto/principal-kpi.response';

@ApiTags('Principal')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'principal', version: '1' })
export class PrincipalController {
  constructor(private readonly principalService: PrincipalService) {}

  @Get('kpi')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'School-wide KPI snapshot for the principal dashboard' })
  getKpi(): Promise<PrincipalKpiResponse> {
    return this.principalService.getKpi();
  }

  @Get('approvals')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Unified pending approval queue (fee waivers + leave + expenses)' })
  getApprovalQueue(): Promise<ApprovalQueueItem[]> {
    return this.principalService.getApprovalQueue();
  }
}
