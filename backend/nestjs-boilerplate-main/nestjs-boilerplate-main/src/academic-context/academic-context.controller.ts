import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { AcademicContextService } from './academic-context.service';

/** AC #15-18 — read-only, non-clinical academic risk context for the MHA session form's sidebar
 * panel. Deliberately narrower than mha-consent's/mha-session's read routes (no admin/principal):
 * the AI prompt for this story is explicit — "accessible to Counselor and SchoolPsychologist
 * roles only." A second controller under the `students` prefix, same technique already used by
 * StudentDocumentsController — no changes needed to StudentsController/StudentsModule. */
@ApiTags('MHA — Academic Context')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'students', version: '1' })
export class AcademicContextController {
  constructor(private readonly academicContextService: AcademicContextService) {}

  @Get(':studentId/academic-context')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Read-only academic risk context (attendance, grade trend, pattern flags) for the MHA session form. Non-clinical — not part of the MHA session record.',
  })
  async getAcademicContext(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
  ) {
    return this.academicContextService.getAcademicContext(studentId);
  }
}
