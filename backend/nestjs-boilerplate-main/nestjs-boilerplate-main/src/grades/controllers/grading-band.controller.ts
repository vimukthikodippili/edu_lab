import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { GradingBandService } from '../services/grading-band.service';
import { CreateGradingBandDto } from '../dto/create-grading-band.dto';
import { UpdateGradingBandDto } from '../dto/update-grading-band.dto';

@ApiTags('Grades — Grading Bands')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/grading-bands', version: '1' })
export class GradingBandController {
  constructor(private readonly gradingBandService: GradingBandService) {}

  @Get()
  @Roles(
    RoleEnum.teacher,
    RoleEnum.section_head,
    RoleEnum.admin,
    RoleEnum.principal,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List the configured grading bands' })
  findAll() {
    return this.gradingBandService.findAll();
  }

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new grading band' })
  create(@Body() dto: CreateGradingBandDto) {
    return this.gradingBandService.create(dto);
  }

  @Patch(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a grading band' })
  update(@Param('id') id: string, @Body() dto: UpdateGradingBandDto) {
    return this.gradingBandService.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a grading band' })
  remove(@Param('id') id: string) {
    return this.gradingBandService.remove(Number(id));
  }
}
