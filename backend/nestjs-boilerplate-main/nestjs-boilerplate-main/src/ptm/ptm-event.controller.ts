import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { PTMEventService } from './ptm-event.service';
import { CreatePtmEventDto } from './dto/create-ptm-event.dto';
import { SubmitAvailabilityDto } from './dto/submit-availability.dto';

/** P5-PP-01 — FR-P5-PP-01/02/06. Admin/Principal/Section Head create + publish; Teacher confirms
 * availability and views their own schedule; Guardian only ever sees published events (enforced
 * server-side in `PTMEventService.findAll`, matching the Events module's own draft/published split). */
@ApiTags('PTM — Events')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'ptm-events', version: '1' })
export class PTMEventController {
  constructor(
    private readonly ptmEventService: PTMEventService,
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
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a draft PTM event' })
  async create(@Body() dto: CreatePtmEventDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.ptmEventService.create(dto, staffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List PTM events (guardians only see published ones)' })
  async findAll(@Request() req: { user: { role?: { id?: number } } }) {
    const isGuardian = req.user.role?.id === RoleEnum.guardian;
    return this.ptmEventService.findAll(isGuardian);
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch a single PTM event' })
  async getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ptmEventService.getById(id);
  }

  @Post(':id/availability')
  @Roles(RoleEnum.teacher)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Submit or update the calling teacher's available window for this PTM event" })
  async submitAvailability(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SubmitAvailabilityDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const teacherId = await this.resolveStaffId(req.user.id);
    return this.ptmEventService.submitAvailability(id, teacherId, dto);
  }

  @Post(':id/publish')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publish a PTM event, generating every teacher's slots from their confirmed availability" })
  async publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.ptmEventService.publish(id);
  }

  @Get(':id/teacher-schedule')
  @Roles(RoleEnum.teacher, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A teacher's full PTM schedule for this event (own schedule, or any teacher's for Admin/Principal)" })
  async getTeacherSchedule(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('teacherId') queryTeacherId: string | undefined,
    @Request() req: { user: { id: unknown; role?: { id?: number } } },
  ) {
    const isTeacher = req.user.role?.id === RoleEnum.teacher;
    const teacherId = isTeacher ? await this.resolveStaffId(req.user.id) : queryTeacherId;
    if (!teacherId) {
      throw new UnprocessableEntityException('teacherId query parameter is required.');
    }
    return this.ptmEventService.getTeacherSchedule(id, teacherId);
  }
}
