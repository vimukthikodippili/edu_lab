import {
  Body,
  Controller,
  Delete,
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
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { TimetableService } from './timetable.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { FinalizeTimetableDto } from './dto/finalize-timetable.dto';

@ApiTags('timetable')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'timetable', version: '1' })
export class TimetableController {
  constructor(private readonly svc: TimetableService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Auto-generate a first-draft weekly timetable from configured period requirements' })
  generate(@Body() dto: GenerateTimetableDto) {
    return this.svc.generate(dto);
  }

  @Get('class-sections/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the timetable for a specific class section' })
  findByClassSection(
    @Param('id', ParseIntPipe) id: number,
    @Query('academicYear') academicYear: string,
  ) {
    return this.svc.findByClassSection(id, academicYear);
  }

  @Get('teachers/:teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the weekly schedule for a specific teacher' })
  findByTeacher(
    @Param('teacherId', new ParseUUIDPipe({ version: '4' })) teacherId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.svc.findByTeacher(teacherId, academicYear);
  }

  @Patch('entries/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Manually move a timetable entry to a different slot' })
  updateEntry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimetableEntryDto) {
    return this.svc.updateEntry(id, dto);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Remove a timetable entry' })
  async deleteEntry(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.svc.deleteEntry(id);
  }

  @Post('finalize')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Finalize the timetable for an academic year, locking it and notifying teachers' })
  finalize(@Body() dto: FinalizeTimetableDto) {
    return this.svc.finalize(dto);
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Unlock a finalized timetable to allow further edits' })
  unlock(@Body() dto: FinalizeTimetableDto) {
    return this.svc.unlock(dto);
  }

  @Get('record/:academicYear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get finalization status for an academic year' })
  getRecord(@Param('academicYear') academicYear: string) {
    return this.svc.getRecord(academicYear);
  }
}
