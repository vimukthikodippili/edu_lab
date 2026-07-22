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
import { LabTypeService } from './lab-type.service';
import { CreateLabTypeDto } from './dto/create-lab-type.dto';
import { UpdateLabTypeDto } from './dto/update-lab-type.dto';

/** "As a principal or admin..." — unlike the Sport Type precedent (admin/principal/section_head),
 * management here is admin/principal only, per the literal story wording. Read access stays
 * broad since browsing the catalog (e.g. to pick a type when registering a lab) is a staff-wide
 * need. */
@ApiTags('Labs — Lab Types')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'lab-types', version: '1' })
export class LabTypeController {
  constructor(private readonly labTypeService: LabTypeService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all lab types — the catalog used when registering a lab' })
  async findAll() {
    return this.labTypeService.findAll();
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new lab type (e.g. Robotics)' })
  async create(@Body() dto: CreateLabTypeDto) {
    return this.labTypeService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a lab type' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateLabTypeDto,
  ) {
    return this.labTypeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lab type — 409 if any lab currently uses it' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.labTypeService.delete(id);
  }
}
