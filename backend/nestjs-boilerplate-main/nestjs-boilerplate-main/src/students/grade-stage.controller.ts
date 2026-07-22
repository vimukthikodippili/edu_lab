import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { GradeStageService } from './grade-stage.service';
import { CreateGradeStageDto } from './dto/create-grade-stage.dto';
import { UpdateGradeStageDto } from './dto/update-grade-stage.dto';
import { ReorderGradeStagesDto } from './dto/reorder-grade-stages.dto';

/** "Principal or Admin can view current stage definitions, edit... add... delete... reorder" —
 * mutation routes are admin/principal only, per the literal spec. GET stays readable by the
 * broader set of roles whose own pages display a resolved stage name (timetable setup,
 * requirements, attendance), mirroring the sport-types catalog's own read/write role split. */
@ApiTags('Grade Stages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grade-stages', version: '1' })
export class GradeStageController {
  constructor(private readonly gradeStageService: GradeStageService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all grade stages, in display order' })
  findAll() {
    return this.gradeStageService.findAll();
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new grade stage' })
  create(@Body() dto: CreateGradeStageDto) {
    return this.gradeStageService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a grade stage — returns non-blocking warnings if a grade is left uncovered' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateGradeStageDto,
  ) {
    return this.gradeStageService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a grade stage — 409 if any student or class section is currently in it' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.gradeStageService.delete(id);
  }

  @Post('reorder')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Persist a new display order for all grade stages (drag-and-drop)' })
  reorder(@Body() dto: ReorderGradeStagesDto) {
    return this.gradeStageService.reorder(dto.orderedIds);
  }
}
