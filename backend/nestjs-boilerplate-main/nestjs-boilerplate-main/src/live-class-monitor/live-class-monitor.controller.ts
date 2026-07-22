import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { LiveClassMonitorService, LiveClassStatusEntry } from './live-class-monitor.service';
import { LiveClassMonitorQueryDto } from './dto/live-class-monitor-query.dto';

@ApiTags('Live Class Monitor')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'live-class-monitor', version: '1' })
export class LiveClassMonitorController {
  constructor(private readonly liveClassMonitorService: LiveClassMonitorService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async getStatusGrid(
    @Query() query: LiveClassMonitorQueryDto,
  ): Promise<LiveClassStatusEntry[]> {
    return this.liveClassMonitorService.getTodayStatusGrid(query.gradeFrom, query.gradeTo);
  }
}
