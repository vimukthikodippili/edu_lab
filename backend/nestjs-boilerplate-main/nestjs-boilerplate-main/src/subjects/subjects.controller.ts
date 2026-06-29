import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { SubjectsService } from './subjects.service';
import { CreateSubjectCategoryDto } from './dto/create-subject-category.dto';
import { UpdateSubjectCategoryDto } from './dto/update-subject-category.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';

@ApiTags('Subjects')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'subjects', version: '1' })
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  // ─── Subject Categories ──────────────────────────────────────────────────────

  @Post('categories')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subject category' })
  createCategory(@Body() dto: CreateSubjectCategoryDto) {
    return this.subjectsService.createCategory(dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all subject categories' })
  findAllCategories(@Query('includeInactive') includeInactive?: string) {
    return this.subjectsService.findAllCategories(includeInactive === 'true');
  }

  @Patch('categories/:id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Update a subject category' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectCategoryDto,
  ) {
    return this.subjectsService.updateCategory(id, dto);
  }

  @Patch('categories/:id/deactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Deactivate a category (guard: no active subjects)' })
  deactivateCategory(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.deactivateCategory(id);
  }

  @Patch('categories/:id/reactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Reactivate a previously deactivated category' })
  reactivateCategory(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.reactivateCategory(id);
  }

  // ─── Subjects ────────────────────────────────────────────────────────────────

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subject' })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List subjects (paginated, filterable)' })
  findMany(@Query() query: QuerySubjectDto) {
    return this.subjectsService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subject by ID (resolves regardless of isActive — historical reference)' })
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.subjectsService.findById(id);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Update subject details' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Deactivate a subject (isActive=false; row is never deleted)' })
  deactivate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.subjectsService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Reactivate a subject (422 if category is inactive)' })
  reactivate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.subjectsService.reactivate(id);
  }
}
