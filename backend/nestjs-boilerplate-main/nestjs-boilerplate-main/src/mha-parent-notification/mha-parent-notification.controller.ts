import {
  Body,
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
import { MhaParentNotificationService } from './mha-parent-notification.service';
import { NotifyGuardianDto } from './dto/notify-guardian.dto';

/** MHA-134 — FR-MHA-33/AI prompt "visible to Counselor role only." Deliberately narrower than
 * this module's usual counselor+school_psychologist write-role pairing — both FR-MHA-33's own
 * text and the AI prompt specifically and consistently say "counselor" alone here. */
@ApiTags('MHA — Parent Notification')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mha-sessions', version: '1' })
export class MhaParentNotificationController {
  constructor(
    private readonly parentNotificationService: MhaParentNotificationService,
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

  @Post(':id/notify-guardian')
  @Roles(RoleEnum.counselor)
  @ApiOperation({ summary: 'Send a non-clinical wellbeing check-in notification to a student\'s guardians' })
  async notifyGuardian(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: NotifyGuardianDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.parentNotificationService.notifyGuardians(id, dto.note, actorStaffId);
  }
}
