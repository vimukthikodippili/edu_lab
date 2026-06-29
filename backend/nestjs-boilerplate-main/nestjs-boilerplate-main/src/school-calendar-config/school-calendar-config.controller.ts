import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { GradeStage } from '../students/entities/grade.entity';
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

  @Get(':stage')
  findByStage(@Param('stage', new ParseEnumPipe(GradeStage)) stage: GradeStage) {
    return this.svc.findByStage(stage);
  }

  @Put(':stage')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  upsert(
    @Param('stage', new ParseEnumPipe(GradeStage)) stage: GradeStage,
    @Body() dto: UpsertCalendarConfigDto,
  ) {
    return this.svc.upsert(stage, dto);
  }
}
