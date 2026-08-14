import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import {
  PrincipalService,
  ApprovalQueueItem,
  ApprovalHistoryItem,
} from './principal.service';
import { PrincipalKpiResponse } from './dto/principal-kpi.response';
import { WellbeingConcernDto } from './dto/wellbeing-concern.dto';

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

  @Get('approvals/history')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Decided (approved/rejected) approval items — audit history' })
  getApprovalHistory(): Promise<ApprovalHistoryItem[]> {
    return this.principalService.getApprovalHistory();
  }

  // FR-MHA-34/AC #94 — narrower than the KPI endpoint above: Principal and Counselor only,
  // deliberately excluding admin, per the AC's literal role list.
  @Get('wellbeing-concerns')
  @Roles(RoleEnum.principal, RoleEnum.counselor)
  @ApiOperation({ summary: 'De-identified drill-down for the Student Wellbeing KPI — name, grade, highest level only' })
  getWellbeingConcerns(): Promise<WellbeingConcernDto[]> {
    return this.principalService.getWellbeingConcerns();
  }
}
