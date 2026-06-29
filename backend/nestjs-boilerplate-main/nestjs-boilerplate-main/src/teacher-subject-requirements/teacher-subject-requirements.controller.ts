import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { TeacherSubjectRequirementsService } from './teacher-subject-requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@ApiTags('teacher-subject-requirements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'teacher-subject-requirements', version: '1' })
export class TeacherSubjectRequirementsController {
  constructor(private readonly svc: TeacherSubjectRequirementsService) {}

  @Get('class-sections/:id')
  @HttpCode(HttpStatus.OK)
  findByClassSection(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findByClassSection(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  create(@Body() dto: CreateRequirementDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRequirementDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.svc.delete(id);
  }
}
