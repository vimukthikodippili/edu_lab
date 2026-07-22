import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { SchoolSettingsService } from './school-settings.service';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';

@ApiTags('school-settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'school-settings', version: '1' })
export class SchoolSettingsController {
  constructor(private readonly svc: SchoolSettingsService) {}

  @Get()
  find() {
    return this.svc.get();
  }

  @Patch()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  update(@Body() dto: UpdateSchoolSettingsDto) {
    return this.svc.update(dto);
  }
}
