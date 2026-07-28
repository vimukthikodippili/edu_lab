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
import { MhaConsentService } from './mha-consent.service';
import { RecordMhaConsentDto } from './dto/record-mha-consent.dto';

/** Write (recording consent) is deliberately Counselor/School-Psychologist only — matches
 * counselor-notes.controller.ts's own POST endpoint, which is `counselor`-only for the same
 * reason: consent is a counselor-authored record, not something Admin/Principal author on their
 * behalf. Read is broader (adds admin/principal) but still excludes teacher/section_head per
 * FR-MHA-30 — this is real per-student data, not shared configuration. */
@ApiTags('MHA — Guardian Consent')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'mha-consent', version: '1' })
export class MhaConsentController {
  constructor(
    private readonly consentService: MhaConsentService,
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

  @Post('students/:studentId')
  @Roles(RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record guardian consent for MHA screening — supersedes any prior active consent' })
  async record(
    @Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
    @Body() dto: RecordMhaConsentDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.consentService.recordConsent(studentId, dto, staffId);
  }

  @Get('students/:studentId')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Fetch a student's current consent status and full consent history" })
  async getStatus(@Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string) {
    return this.consentService.getConsentStatus(studentId);
  }
}
