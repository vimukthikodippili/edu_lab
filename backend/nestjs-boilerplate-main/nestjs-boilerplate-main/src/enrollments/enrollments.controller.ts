import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { EnrollmentsService } from './enrollments.service';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { AddStreamSubjectDto } from './dto/add-stream-subject.dto';
import { ReplaceEnrollmentsDto } from './dto/replace-enrollments.dto';
import { AssignStreamDto } from './dto/assign-stream.dto';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'enrollments', version: '1' })
export class EnrollmentsController {
  constructor(private readonly svc: EnrollmentsService) {}

  // ─────────────────────── A/L Streams ──────────────────────────────────────

  @Post('streams')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  createStream(@Body() dto: CreateStreamDto) {
    return this.svc.createStream(dto);
  }

  @Get('streams')
  listStreams(@Query('includeInactive') includeInactive?: string) {
    return this.svc.findAllStreams(includeInactive === 'true');
  }

  @Patch('streams/:id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  updateStream(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStreamDto) {
    return this.svc.updateStream(id, dto);
  }

  @Patch('streams/:id/deactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  deactivateStream(@Param('id', ParseIntPipe) id: number) {
    return this.svc.deactivateStream(id);
  }

  @Patch('streams/:id/reactivate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  reactivateStream(@Param('id', ParseIntPipe) id: number) {
    return this.svc.reactivateStream(id);
  }

  @Get('streams/:id/subjects')
  getStreamSubjects(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getStreamSubjects(id);
  }

  @Post('streams/:id/subjects')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  addSubjectToStream(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddStreamSubjectDto,
  ) {
    return this.svc.addSubjectToStream(id, dto.subjectId);
  }

  @Delete('streams/:id/subjects/:subjectId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  removeSubjectFromStream(
    @Param('id', ParseIntPipe) id: number,
    @Param('subjectId', new ParseUUIDPipe({ version: '4' })) subjectId: string,
  ) {
    return this.svc.removeSubjectFromStream(id, subjectId);
  }

  // ─────────────────────── Per-Student Enrollment ───────────────────────────

  @Get('students/:studentId')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.teacher,
    RoleEnum.section_head,
  )
  findStudentEnrollments(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
  ) {
    return this.svc.findStudentEnrollments(studentId);
  }

  @Put('students/:studentId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  replaceEnrollments(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Body() dto: ReplaceEnrollmentsDto,
  ) {
    return this.svc.replaceEnrollments(studentId, dto);
  }

  @Post('students/:studentId/subjects/:subjectId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  addEnrollment(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Param('subjectId', new ParseUUIDPipe({ version: '4' })) subjectId: string,
  ) {
    return this.svc.addEnrollment(studentId, subjectId);
  }

  @Delete('students/:studentId/subjects/:subjectId')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  removeEnrollment(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Param('subjectId', new ParseUUIDPipe({ version: '4' })) subjectId: string,
  ) {
    return this.svc.removeEnrollment(studentId, subjectId);
  }

  @Patch('students/:studentId/stream')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  assignStream(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Body() dto: AssignStreamDto,
  ) {
    return this.svc.assignStream(studentId, dto);
  }

  @Delete('students/:studentId/stream')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  removeStream(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
  ) {
    return this.svc.removeStream(studentId);
  }
}
