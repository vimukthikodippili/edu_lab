import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../roles/roles.decorator';
import { RoleEnum } from '../../roles/roles.enum';
import { RolesGuard } from '../../roles/roles.guard';
import { StudentSummaryService } from '../services/student-summary.service';

/** Admin/Principal only — a school-wide, cross-subject consolidated view of a single student.
 * Deliberately narrower than most grades-module reads (which also allow section_head/teacher
 * scoped to their own subject+class): this composes data across every subject a student has,
 * which is exactly the "browse anyone's full record" shape this codebase otherwise reserves for
 * admin/principal (see StudentsController.findById's own role list, and the — separately,
 * deliberately narrower — MHA/wellbeing endpoints that exclude admin entirely for a different
 * reason). No teacher-scoped branch is needed here since a teacher only ever needs their own
 * subject+class view, already served by the existing per-subject/per-class endpoints. */
@ApiTags('Grades — Student Summary')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'grades/students', version: '1' })
export class StudentSummaryController {
  constructor(private readonly studentSummaryService: StudentSummaryService) {}

  @Get(':studentId/summary')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Consolidated marks/attendance/trend/topic-weakness/flag summary for one student",
  })
  async getSummary(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Query('termId') termId?: string,
  ) {
    return this.studentSummaryService.getStudentSummary(
      studentId,
      termId ? Number(termId) : undefined,
    );
  }
}
