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
  Query,
  Request,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { VisitorService } from './visitor.service';
import { SignInVisitorDto } from './dto/sign-in-visitor.dto';
import { SetBlockedDto } from './dto/set-blocked.dto';
import { BlockNewVisitorDto } from './dto/block-new-visitor.dto';
import { SearchVisitorsDto } from './dto/search-visitors.dto';

/** P5-VM-01 — FR-P5-VM-01/09/13/14. "Reception" has no distinct portal role in this codebase —
 * mapped to `security_officer`, the nearest real role, same adjustment made repeatedly for
 * AI-prompt roles with no `RoleEnum` counterpart. Block-list mutation stays Admin/Principal-only,
 * matching FR-P5-VM-14's literal "Admin can add a person to a blocked visitor list." */
@ApiTags('Visitors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'visitors', version: '1' })
export class VisitorController {
  constructor(
    private readonly visitorService: VisitorService,
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

  @Post('sign-in')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign in a visitor, notify their host, and issue a digital badge' })
  async signIn(@Body() dto: SignInVisitorDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.visitorService.signIn(dto, staffId);
  }

  @Post(':logId/sign-out')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out a visitor and record their visit duration' })
  async signOut(
    @Param('logId', new ParseUUIDPipe({ version: '4' })) logId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.visitorService.signOut(logId, staffId);
  }

  @Get('active')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List everyone currently signed in and not yet signed out' })
  async listActive() {
    return this.visitorService.listActive();
  }

  @Get('search')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search the visitor history log for security investigations' })
  async search(@Query() filters: SearchVisitorsDto) {
    return this.visitorService.search(filters);
  }

  @Get('daily-report')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Daily visitor summary for a given date' })
  async dailyReport(@Query('date') date: string) {
    return this.visitorService.getDailyReport(date);
  }

  @Patch(':visitorId/block')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove a visitor from the blocked list (Admin/Principal only)' })
  async setBlocked(
    @Param('visitorId', new ParseUUIDPipe({ version: '4' })) visitorId: string,
    @Body() dto: SetBlockedDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.visitorService.setBlocked(visitorId, dto, staffId);
  }

  @Post('block-list')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Block a person by name and ID number, even if they have never visited (Admin/Principal only)',
  })
  async blockNewVisitor(@Body() dto: BlockNewVisitorDto, @Request() req: { user: { id: unknown } }) {
    const staffId = await this.resolveStaffId(req.user.id);
    return this.visitorService.blockNewVisitor(dto, staffId);
  }

  @Get(':logId/badge/pdf')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @ApiOperation({ summary: 'Download a printable badge PDF for this visit' })
  async badgePdf(
    @Param('logId', new ParseUUIDPipe({ version: '4' })) logId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.visitorService.generateBadgePdf(logId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="visitor-badge-${logId}.pdf"`);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }

  @Get('badge/verify/:code')
  @Roles(RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan-verify a badge QR code is valid, active, and not expired' })
  async verifyBadge(@Param('code') code: string) {
    return this.visitorService.verifyBadge(code);
  }
}
