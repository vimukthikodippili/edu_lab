import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { SchoolCalendarConfigService } from './school-calendar-config.service';
import { UpsertCalendarConfigDto } from './dto/upsert-calendar-config.dto';

@ApiTags('school-calendar-config')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'school-calendar-config', version: '1' })
export class SchoolCalendarConfigController {
  constructor(private readonly svc: SchoolCalendarConfigService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':gradeStageId')
  findByStageId(@Param('gradeStageId', new ParseUUIDPipe({ version: '4' })) gradeStageId: string) {
    return this.svc.findByStageId(gradeStageId);
  }

  @Put(':gradeStageId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  upsert(
    @Param('gradeStageId', new ParseUUIDPipe({ version: '4' })) gradeStageId: string,
    @Body() dto: UpsertCalendarConfigDto,
  ) {
    return this.svc.upsert(gradeStageId, dto);
  }
}
