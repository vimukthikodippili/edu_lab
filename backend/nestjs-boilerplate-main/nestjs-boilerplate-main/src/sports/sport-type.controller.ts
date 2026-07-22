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
import { SportTypeService } from './sport-type.service';
import { CreateSportTypeDto } from './dto/create-sport-type.dto';
import { UpdateSportTypeDto } from './dto/update-sport-type.dto';
import { CreateSportMetricDto } from './dto/create-sport-metric.dto';
import { UpdateSportMetricDto } from './dto/update-sport-metric.dto';

/** Same role set as FR-P3-SS-01 sport creation (admin/principal/section_head) — managing the
 * catalog of sport types is a natural extension of "who manages the sports program." */
@ApiTags('Sports — Sport Types')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'sport-types', version: '1' })
export class SportTypeController {
  constructor(private readonly sportTypeService: SportTypeService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all sport types — the catalog a coach picks from when a sport is created' })
  async findAll() {
    return this.sportTypeService.findAll();
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new sport type (e.g. Karate)' })
  async create(@Body() dto: CreateSportTypeDto) {
    return this.sportTypeService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a sport type or toggle its personal-best eligibility' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSportTypeDto,
  ) {
    return this.sportTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sport type — 409 if any sport currently uses it' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.sportTypeService.delete(id);
  }

  @Get(':id/metrics')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A sport type's fixed metric list" })
  async findMetrics(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.sportTypeService.findMetrics(id);
  }

  @Post(':id/metrics')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a metric to a sport type — necessary for a newly added type to be usable' })
  async createMetric(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateSportMetricDto,
  ) {
    return this.sportTypeService.createMetric(id, dto);
  }

  @Patch('metrics/:metricId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a sport type metric' })
  async updateMetric(
    @Param('metricId', new ParseUUIDPipe({ version: '4' })) metricId: string,
    @Body() dto: UpdateSportMetricDto,
  ) {
    return this.sportTypeService.updateMetric(metricId, dto);
  }

  @Delete('metrics/:metricId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a metric from a sport type' })
  async deleteMetric(@Param('metricId', new ParseUUIDPipe({ version: '4' })) metricId: string) {
    await this.sportTypeService.deleteMetric(metricId);
  }
}
