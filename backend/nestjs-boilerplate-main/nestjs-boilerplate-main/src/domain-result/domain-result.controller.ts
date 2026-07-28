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
import { DomainResultService } from './domain-result.service';
import { UpdateDomainResultDto } from './dto/update-domain-result.dto';

/** MHA-120 — FR-MHA-30 read literally: domain-result content (symptoms, level, notes) is visible
 * to principal/counselor/school_psychologist only — narrower than the mha-sessions/:id shell,
 * which also admits admin. Writing (FR-MHA-02) stays counselor/school_psychologist-only; principal
 * is read-only oversight, not an assessor. */
@ApiTags('MHA — Domain Results')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mha-sessions', version: '1' })
export class DomainResultController {
  constructor(
    private readonly domainResultService: DomainResultService,
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

  @Get(':sessionId/domain-results')
  @Roles(RoleEnum.principal, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List domain results (symptoms, risk level, notes) for a session' })
  async list(@Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string) {
    return this.domainResultService.listBySession(sessionId);
  }

  @Patch(':sessionId/domain-results/:id')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save observed symptoms / risk level / notes for one domain (auto-save)' })
  async update(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDomainResultDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const counselorStaffId = await this.resolveStaffId(req.user.id);
    return this.domainResultService.update(sessionId, id, dto, counselorStaffId);
  }
}
