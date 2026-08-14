import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { AcademicTermsService } from '../services/academic-terms.service';
import { CreateAcademicTermDto } from '../dto/create-academic-term.dto';

@ApiTags('Grades — Academic Terms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/terms', version: '1' })
export class AcademicTermsController {
  constructor(private readonly termsService: AcademicTermsService) {}

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new academic term (admin/principal/section head)' })
  create(@Body() dto: CreateAcademicTermDto) {
    return this.termsService.create(dto);
  }

  @Get()
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.accountant,
    RoleEnum.student,
    RoleEnum.guardian,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all academic terms' })
  findAll() {
    return this.termsService.findAll();
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an academic term' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.termsService.remove(id);
  }
}
