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
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { EquipmentCategoryService } from './equipment-category.service';
import { CreateEquipmentCategoryDto } from './dto/create-equipment-category.dto';
import { UpdateEquipmentCategoryDto } from './dto/update-equipment-category.dto';

/** Management is admin/principal only — a school-wide catalog decision, exact mirror of
 * LabTypeController's own role gating. Read stays broad so a Lab In-Charge can populate the
 * category dropdown when registering equipment. */
@ApiTags('Equipment — Categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'equipment-categories', version: '1' })
export class EquipmentCategoryController {
  constructor(private readonly categoryService: EquipmentCategoryService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List equipment categories, optionally filtered by lab type' })
  async findAll(@Query('labTypeId') labTypeId?: string) {
    return this.categoryService.findAll(labTypeId);
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new equipment category for a lab type' })
  async create(@Body() dto: CreateEquipmentCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit an equipment category' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEquipmentCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an equipment category — 409 if any equipment uses it' })
  async delete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.categoryService.delete(id);
  }
}
