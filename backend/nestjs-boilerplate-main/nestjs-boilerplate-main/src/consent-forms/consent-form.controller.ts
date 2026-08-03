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
import { ConsentFormService } from './consent-form.service';
import { CreateConsentFormDto } from './dto/create-consent-form.dto';

/** P5-PP-04 — FR-P5-PP-18/19/21. "Admin" maps to `admin, principal` — the same fully-privileged
 * convention used everywhere else this session for an AI-prompt actor with no distinct RoleEnum
 * value. */
@ApiTags('Consent Forms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'consent-forms', version: '1' })
export class ConsentFormController {
  constructor(
    private readonly consentFormService: ConsentFormService,
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
  @ApiOperation({ summary: 'Create a digital consent form and notify every targeted guardian' })
  async create(@Body() dto: CreateConsentFormDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.consentFormService.create(dto, staffId);
  }

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all consent forms' })
  async findAll() {
    return this.consentFormService.findAll();
  }

  @Get(':id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single consent form' })
  async getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.consentFormService.getById(id);
  }

  @Get(':id/dashboard')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Per-student signed/declined/pending status for this form' })
  async getDashboard(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.consentFormService.getDashboard(id);
  }

  @Post(':id/remind-pending')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a reminder to every guardian who has not yet responded' })
  async remindPending(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    const remindedCount = await this.consentFormService.remindPending(id, staffId);
    return { remindedCount };
  }
}
