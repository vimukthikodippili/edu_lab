import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { BiometricService } from './biometric.service';
import { BiometricReportService } from './biometric-report.service';
import { EnrollBiometricDto } from './dto/enroll-biometric.dto';
import { ManualOverrideBiometricDto } from './dto/manual-override-biometric.dto';
import { VerifyBiometricDto } from './dto/verify-biometric.dto';
import { ReleaseLogQueryDto } from './dto/release-log-query.dto';

@ApiTags('Biometric')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'biometric', version: '1' })
export class BiometricController {
  constructor(
    private readonly biometricService: BiometricService,
    private readonly reportService: BiometricReportService,
    private readonly usersService: UsersService,
    private readonly staffService: StaffService,
  ) {}

  private async resolveStaffId(userId: string): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.email) throw new UnprocessableEntityException('User account has no email.');
    const staff = await this.staffService.findByEmail(user.email);
    if (!staff) throw new UnprocessableEntityException('No staff record linked to your account.');
    return staff.id;
  }

  @Post('guardian/:id/consent')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record explicit biometric consent for a guardian' })
  async recordConsent(
    @Param('id', ParseUUIDPipe) guardianId: string,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.biometricService.recordConsent(guardianId, staffId);
  }

  @Delete('guardian/:id/consent')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke biometric consent and delete vault entry for a guardian' })
  async revokeConsent(
    @Param('id', ParseUUIDPipe) guardianId: string,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    await this.biometricService.revokeConsent(guardianId, staffId);
  }

  @Post('guardian/:id')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll biometric template for a guardian (requires active consent)' })
  async enroll(
    @Param('id', ParseUUIDPipe) guardianId: string,
    @Body() dto: EnrollBiometricDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.biometricService.enroll(guardianId, dto, staffId);
  }

  @Get('guardian/:id')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @ApiOperation({ summary: 'Get biometric enrollment status for a guardian' })
  async getStatus(@Param('id', ParseUUIDPipe) guardianId: string) {
    return this.biometricService.getStatus(guardianId);
  }

  @Post('guardian/:id/verify')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify guardian biometric at gate terminal — match/no-match within 3 seconds' })
  async verify(
    @Param('id', ParseUUIDPipe) guardianId: string,
    @Body() dto: VerifyBiometricDto,
  ) {
    return this.biometricService.verify(guardianId, dto);
  }

  @Post('guardian/:id/override')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manual override release after biometric failure — requires reason + secondary ID check (FR-GS-11)',
  })
  async manualOverride(
    @Param('id', ParseUUIDPipe) guardianId: string,
    @Body() dto: ManualOverrideBiometricDto,
    @Request() req: { user: { id: string } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.biometricService.manualOverride(guardianId, dto, staffId);
  }

  // ── Release log — read-only (append-only: no PATCH/PUT/DELETE routes exist) ─

  @Get('release-log/summary')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Daily summary of all release events (FR-GS-12 / FR-PR-13)' })
  async getDailySummary(@Query('date') date?: string) {
    return this.reportService.getDailySummary(date);
  }

  @Get('release-log/incidents')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Security incidents: failed verifications and manual overrides' })
  async getIncidents(@Query() query: ReleaseLogQueryDto) {
    return this.reportService.getIncidents(query);
  }

  @Get('release-log')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.security_officer)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paginated full audit log of all release events' })
  async getReleaseLog(@Query() query: ReleaseLogQueryDto) {
    return this.reportService.getReleaseLog(query);
  }
}
