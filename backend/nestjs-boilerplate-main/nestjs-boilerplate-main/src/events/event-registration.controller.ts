import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { EventRegistrationService } from './event-registration.service';
import { RegisterEventDto } from './dto/register-event.dto';

/** P5-EV-01 — FR-P5-EV-07/09/11. Guardian-only, self-scoped. No shared `resolveGuardianId()`
 * helper exists anywhere in this codebase (unlike `resolveStaffId`) — the established pattern
 * (`lab-reports.controller.ts`, `students.controller.ts`'s `guardians/me`) is this exact inline
 * lookup, duplicated per-controller. `registrations/me`/`registrations/:id/cancel` are distinct
 * segment-count paths from `EventController`'s `:id`/`:id/publish`/`:id/cancel` routes, so there's
 * no route-collision risk sharing the `events` path prefix across the two controllers. */
@ApiTags('School Events — Registration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'events', version: '1' })
export class EventRegistrationController {
  constructor(
    private readonly registrationService: EventRegistrationService,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,
  ) {}

  private async resolveGuardianId(userId: unknown): Promise<string> {
    const guardian = await this.guardianRepo.findOne({ where: { userId: userId as number } });
    if (!guardian) {
      throw new NotFoundException('Your account is not yet linked to a guardian record — contact your school administrator.');
    }
    return guardian.id;
  }

  @Post(':eventId/register')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register for a published event — issues a ticket if capacity allows, otherwise waitlists' })
  async register(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Body() dto: RegisterEventDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.registrationService.register(eventId, guardianId, dto.studentId);
  }

  @Get('registrations/me')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "My event registrations" })
  async myRegistrations(@Request() req: { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.registrationService.findMyRegistrations(guardianId);
  }

  @Patch('registrations/:id/cancel')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel my own registration — promotes the next waitlisted guardian if a spot was freed' })
  async cancelMyRegistration(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.registrationService.cancelRegistration(id, guardianId);
  }
}
