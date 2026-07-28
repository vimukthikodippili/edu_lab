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
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';

/** P5-EV-01 — FR-P5-EV-01/03/04/06. Management routes (create/list-all/publish/cancel) are
 * Principal/Admin only, matching AC's literal "principal or admin"; `published` has no `@Roles()`
 * at all — RolesGuard allows any authenticated caller when no roles metadata is set — matching
 * FR-P5-EV-03's "visible to all roles." `published` is declared before `:id` (mirroring
 * MhaSessionController's own `preview`-before-`:id` precedent) so the static segment isn't
 * swallowed by the `:id` wildcard. */
@ApiTags('School Events')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'events', version: '1' })
export class EventController {
  constructor(
    private readonly eventService: EventService,
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

  @Post()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft school event' })
  async create(@Body() dto: CreateEventDto, @Request() req: { user: { id: unknown } }) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.eventService.create(dto, actorStaffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all events (any status) for management' })
  async findAll() {
    return this.eventService.findAll();
  }

  @Get('published')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List published (and cancelled) events — visible to every role' })
  async findPublished() {
    return this.eventService.findPublished();
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single event' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.eventService.getById(id);
  }

  @Patch(':id/publish')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft event — notifies all parents' })
  async publish(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.eventService.publish(id, actorStaffId);
  }

  @Patch(':id/cancel')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an event — cancels all registrations and notifies registered guardians' })
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const actorStaffId = await this.resolveStaffId(req.user.id);
    return this.eventService.cancel(id, actorStaffId);
  }
}
