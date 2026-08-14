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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SyllabusService } from './syllabus.service';
import { CreateSyllabusUnitDto } from './dto/create-syllabus-unit.dto';
import { UpdateSyllabusUnitDto } from './dto/update-syllabus-unit.dto';
import { QuerySyllabusUnitDto } from './dto/query-syllabus-unit.dto';
import { ReorderSyllabusUnitsDto } from './dto/reorder-syllabus-units.dto';
import { CopyFromYearDto } from './dto/copy-from-year.dto';

@ApiTags('syllabus')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'syllabus-units', version: '1' })
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List syllabus units for a subject/grade/year' })
  findAll(@Query() query: QuerySyllabusUnitDto) {
    return this.syllabusService.findAll(query);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a syllabus unit' })
  create(@Body() dto: CreateSyllabusUnitDto) {
    return this.syllabusService.create(dto);
  }

  // NOTE: /reorder and /copy-from-year are registered BEFORE /:id to prevent
  // NestJS from treating these path segments as UUID params.

  @Patch('reorder')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder units by providing an ordered array of UUIDs' })
  reorder(@Body() dto: ReorderSyllabusUnitsDto) {
    return this.syllabusService.reorder(dto);
  }

  @Post('copy-from-year')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Copy all syllabus units from a prior year into a new year' })
  copyFromYear(@Body() dto: CopyFromYearDto) {
    return this.syllabusService.copyFromYear(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a syllabus unit title, description, or order' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSyllabusUnitDto,
  ) {
    return this.syllabusService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.teacher, RoleEnum.section_head)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a syllabus unit' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.syllabusService.remove(id);
  }
}
