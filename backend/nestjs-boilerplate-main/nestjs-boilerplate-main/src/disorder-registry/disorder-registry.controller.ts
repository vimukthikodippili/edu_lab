import {
  Body,
  Controller,
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
import { DisorderRegistryService } from './disorder-registry.service';
import { CreateDisorderRegistryDto } from './dto/create-disorder-registry.dto';
import { UpdateDisorderRegistryDto } from './dto/update-disorder-registry.dto';

/** Read is broad (admin/principal/teacher/counselor/school_psychologist — AC #5 plus FR-MHA
 * groundwork). Management is deliberately Admin-only, not the usual admin+principal pairing
 * used by every other lookup-table controller in this codebase — a disclosed narrowing for this
 * sensitive-adjacent configuration table (AC: "Admin-only CRUD UI for the registry"). */
@ApiTags('MHA — Disorder Registry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'disorder-registry', version: '1' })
export class DisorderRegistryController {
  constructor(private readonly registryService: DisorderRegistryService) {}

  @Get()
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List disorder/test registry domains, optionally active-only' })
  async findAll(@Query('activeOnly') activeOnly?: string) {
    return this.registryService.findAll(activeOnly === 'true');
  }

  @Get(':id')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.school_psychologist,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single disorder/test registry domain' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.registryService.findById(id);
  }

  @Post()
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new disorder/test registry domain' })
  async create(@Body() dto: CreateDisorderRegistryDto) {
    return this.registryService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a domain, or deactivate/reactivate it via isActive' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDisorderRegistryDto,
  ) {
    return this.registryService.update(id, dto);
  }
}
