import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { ConsentResponseService } from './consent-response.service';
import { RespondToConsentDto } from './dto/respond-to-consent.dto';

/** P5-PP-04 — FR-P5-PP-20/22. Guardian-facing sign/decline. IP address is captured here via
 * `@Req() req: Request` — no precedent for IP capture exists elsewhere in this codebase, so this
 * is established fresh, purely for the permanent-legal-record requirement. */
@ApiTags('Consent Forms — Guardian')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'consent-forms', version: '1' })
export class ConsentResponseController {
  constructor(
    private readonly consentResponseService: ConsentResponseService,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,
  ) {}

  private async resolveGuardianId(userId: unknown): Promise<string> {
    const guardian = await this.guardianRepo.findOne({ where: { userId: userId as number } });
    if (!guardian) {
      throw new NotFoundException('Your account is not linked to a guardian record.');
    }
    return guardian.id;
  }

  @Get('mine/pending')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consent forms targeting one of my children that I have not yet responded to' })
  async listPending(@Req() req: Request & { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.consentResponseService.listPendingForGuardian(guardianId);
  }

  @Get('mine/responses')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My own past consent responses' })
  async listMyResponses(@Req() req: Request & { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.consentResponseService.listMyResponses(guardianId);
  }

  @Post(':formId/respond')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign or decline a consent form on behalf of one of my children' })
  async respond(
    @Param('formId', new ParseUUIDPipe({ version: '4' })) formId: string,
    @Body() dto: RespondToConsentDto,
    @Req() req: Request & { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.consentResponseService.respond(formId, dto, guardianId, req.ip ?? null);
  }
}
