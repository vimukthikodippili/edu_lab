import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StudentTimelineService } from './student-timeline.service';

/** FR-SM-09/FR-MHA-28. Deliberately broad route-level access — the actual mha_session visibility
 * restriction (Counselor/SchoolPsychologist/Principal only, AC #88/91) is enforced inside
 * StudentTimelineService based on the caller's role, not by blocking the route itself. Guardian is
 * included here (even though no guardian-facing student profile page exists yet) so a guardian
 * request gets a 200 with mha_session events correctly absent, not a 403 — that in-service
 * filtering is what AC #91/AI-prompt test (c) actually verifies. */
@ApiTags('Student Timeline')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'students', version: '1' })
export class StudentTimelineController {
  constructor(private readonly timelineService: StudentTimelineService) {}

  @Get(':id/timeline')
  @Roles(
    RoleEnum.admin,
    RoleEnum.principal,
    RoleEnum.section_head,
    RoleEnum.teacher,
    RoleEnum.counselor,
    RoleEnum.school_psychologist,
    RoleEnum.guardian,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Student unified timeline — mha_session events are visible only to Counselor/SchoolPsychologist/Principal" })
  async getTimeline(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { role: { id: number } } },
  ) {
    return this.timelineService.getTimeline(id, req.user.role.id);
  }
}
