import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { SubjectSelectionWindowService } from './subject-selection-window.service';
import { CreateSubjectSelectionWindowDto } from './dto/create-subject-selection-window.dto';
import { UpdateSubjectSelectionWindowDto } from './dto/update-subject-selection-window.dto';
import { SetWindowSubjectsDto } from './dto/set-window-subjects.dto';

@ApiTags('Subject Selection Windows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'enrollments/subject-selection-windows', version: '1' })
export class SubjectSelectionWindowController {
  constructor(private readonly svc: SubjectSelectionWindowService) {}

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Create a subject selection window for a grade stage' })
  create(@Body() dto: CreateSubjectSelectionWindowDto) {
    return this.svc.create(dto);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSubjectSelectionWindowDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Manually force-close or reopen a window, independent of its date range' })
  toggleActive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.toggleActive(id);
  }

  @Get(':id/core-subjects')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  getCoreSubjects(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.getCoreSubjects(id);
  }

  @Post(':id/core-subjects')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  setCoreSubjects(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SetWindowSubjectsDto,
  ) {
    return this.svc.setCoreSubjects(id, dto);
  }

  @Get(':id/optional-subjects')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  getOptionalSubjects(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.getOptionalSubjects(id);
  }

  @Post(':id/optional-subjects')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  setOptionalSubjects(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SetWindowSubjectsDto,
  ) {
    return this.svc.setOptionalSubjects(id, dto);
  }
}
