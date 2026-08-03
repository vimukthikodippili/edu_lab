import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { PreRegisteredVisitorService } from './pre-registered-visitor.service';
import { CreatePreRegisteredVisitorDto } from './dto/create-pre-registered-visitor.dto';

const ANY_STAFF_ROLE = [
  RoleEnum.teacher,
  RoleEnum.section_head,
  RoleEnum.counselor,
  RoleEnum.librarian,
  RoleEnum.accountant,
  RoleEnum.school_psychologist,
  RoleEnum.security_officer,
  RoleEnum.admin,
  RoleEnum.principal,
];

/** P5-VM-01 — FR-P5-VM-04. Pre-registration creation is open to "Staff or teachers" per the AC's
 * literal wording — every staff-linked portal role except student/guardian, since any of them
 * could be the host expecting a visitor. Lookup (for reception's pre-fill) stays reception/admin. */
@ApiTags('Visitors — Pre-Registration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'visitors/pre-registrations', version: '1' })
export class PreRegisteredVisitorController {
  constructor(
    private readonly preRegService: PreRegisteredVisitorService,
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
  @Roles(...ANY_STAFF_ROLE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Pre-register an expected visitor for faster sign-in on arrival' })
  async create(@Body() dto: CreatePreRegisteredVisitorDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.preRegService.create(dto, staffId);
  }

  @Get('today')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List today's unconsumed pre-registrations for reception's pre-fill lookup" })
  async findForToday() {
    return this.preRegService.findForToday();
  }

  @Get('search')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search unconsumed pre-registrations by visitor name' })
  async search(@Query('name') name: string) {
    return this.preRegService.search(name ?? '');
  }
}
