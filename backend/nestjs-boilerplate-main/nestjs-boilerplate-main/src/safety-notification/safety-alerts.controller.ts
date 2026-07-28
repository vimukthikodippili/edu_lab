import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { SafetyAlertsService } from './safety-alerts.service';

/** MHA-133 — AC #3, literal "visible to the Principal" — Principal-only, no admin/counselor
 * read access (unlike most MHA lookup endpoints), since this is Principal oversight of the
 * escalation pipeline itself, not MHA session content. */
@ApiTags('MHA — Safety Alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'safety-alerts', version: '1' })
export class SafetyAlertsController {
  constructor(private readonly safetyAlertsService: SafetyAlertsService) {}

  @Get()
  @Roles(RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List safety-flag notification delivery status for the Principal' })
  async findAll() {
    return this.safetyAlertsService.listAlerts();
  }
}
