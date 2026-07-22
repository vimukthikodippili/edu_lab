import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { LabOverviewService } from './lab-overview.service';
import { LabOverviewFilterDto } from './dto/lab-overview-filter.dto';

@ApiTags('Lab Overview')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.admin, RoleEnum.principal)
@Controller({ path: 'lab-overview', version: '1' })
export class LabOverviewController {
  constructor(private readonly service: LabOverviewService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'All four lab overview panels in one call — lab utilisation, equipment health, experiment coverage, lab report performance' })
  async getDashboard(@Query() filter: LabOverviewFilterDto) {
    return this.service.getDashboard(filter);
  }

  @Get('utilisation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Per-lab confirmed bookings vs total available slots' })
  async getUtilisation(@Query() filter: LabOverviewFilterDto) {
    return this.service.getLabUtilisation(filter);
  }

  @Get('equipment-health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Condition breakdown, low-stock items, and recent damage reports' })
  async getEquipmentHealth(@Query() filter: LabOverviewFilterDto) {
    return this.service.getEquipmentHealth(filter);
  }

  @Get('experiment-coverage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Class section x lab experiment log counts' })
  async getExperimentCoverage(@Query() filter: LabOverviewFilterDto) {
    return this.service.getExperimentCoverage(filter);
  }

  @Get('lab-report-performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Average grade and submission rate per class section per subject' })
  async getLabReportPerformance(@Query() filter: LabOverviewFilterDto) {
    return this.service.getLabReportPerformance(filter);
  }
}
