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
import { PTMBookingService } from './ptm-booking.service';
import { BookSlotDto } from './dto/book-slot.dto';

/** P5-PP-01 — FR-P5-PP-03/05. Guardian self-service — resolves the calling guardian via the same
 * inline `guardianRepo.findOne({where:{userId}})` lookup already established by
 * `EventRegistrationController` (no shared `resolveGuardianId()` helper exists in this codebase). */
@ApiTags('PTM — Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ version: '1' })
export class PTMBookingController {
  constructor(
    private readonly ptmBookingService: PTMBookingService,

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

  @Get('ptm-events/:eventId/slots')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.teacher, RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List available slots for a PTM event, optionally filtered to one teacher' })
  async listAvailableSlots(
    @Param('eventId', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @Query('teacherId') teacherId: string | undefined,
  ) {
    return this.ptmBookingService.listAvailableSlots(eventId, teacherId);
  }

  @Post('ptm-events/:eventId/slots/:slotId/book')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Book a slot with a teacher on behalf of a linked child' })
  async book(
    @Param('slotId', new ParseUUIDPipe({ version: '4' })) slotId: string,
    @Body() dto: BookSlotDto,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.ptmBookingService.book(slotId, dto, guardianId);
  }

  @Post('ptm-bookings/:bookingId/cancel')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel one of the calling guardian’s own bookings, reopening the slot' })
  async cancel(
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
    @Request() req: { user: { id: unknown } },
  ) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.ptmBookingService.cancel(bookingId, guardianId);
  }

  @Get('ptm-bookings/mine')
  @Roles(RoleEnum.guardian)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The calling guardian's own PTM bookings" })
  async listMyBookings(@Request() req: { user: { id: unknown } }) {
    const guardianId = await this.resolveGuardianId(req.user.id);
    return this.ptmBookingService.listMyBookings(guardianId);
  }
}
