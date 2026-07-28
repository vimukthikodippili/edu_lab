import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { RecommendedActionService } from './recommended-action.service';
import { UpdateSessionActionDto } from './dto/update-session-action.dto';

/** MHA-131 — FR-MHA-32. Counselor-facing open/complete tracking for recommended actions.
 * Mirrors DomainResultController's nested-route shape exactly (`mha-sessions/:sessionId/...`,
 * same counselor/school_psychologist write-only roles, same resolveStaffId helper duplicated
 * locally — matches this codebase's established tolerance for that small duplication). */
@ApiTags('MHA — Session Actions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mha-sessions', version: '1' })
export class SessionActionController {
  constructor(
    private readonly recommendedActionService: RecommendedActionService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: unknown): Promise<string> {
    const user = await this.usersService.findById(userId as number);
    if (!user?.email) throw new NotFoundException('User not found.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) {
      throw new UnprocessableEntityException('No staff record linked to your account.');
    }
    return staff.id;
  }

  @Patch(':sessionId/actions/:id')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @ApiOperation({ summary: 'Mark a recommended action open or complete' })
  async updateStatus(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSessionActionDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.recommendedActionService.updateStatus(sessionId, id, dto.status, actorStaffId, dto.completionNote);
  }
}
