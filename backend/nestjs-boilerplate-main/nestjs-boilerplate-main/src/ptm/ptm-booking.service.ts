import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { PTMSlotEntity, PtmSlotStatus } from './entities/ptm-slot.entity';
import { PTMEventEntity } from './entities/ptm-event.entity';
import { PTMBookingEntity, PtmBookingStatus } from './entities/ptm-booking.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffService } from '../staff/staff.service';
import { BookSlotDto } from './dto/book-slot.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

const REMINDER_WINDOW_HOURS = 24;

@Injectable()
export class PTMBookingService {
  constructor(
    @InjectRepository(PTMSlotEntity)
    private readonly slotRepo: Repository<PTMSlotEntity>,

    @InjectRepository(PTMEventEntity)
    private readonly eventRepo: Repository<PTMEventEntity>,

    @InjectRepository(PTMBookingEntity)
    private readonly bookingRepo: Repository<PTMBookingEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    private readonly staffService: StaffService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async listAvailableSlots(eventId: string, teacherId?: string): Promise<PTMSlotEntity[]> {
    return this.slotRepo.find({
      where: {
        ptmEventId: eventId,
        status: PtmSlotStatus.AVAILABLE,
        ...(teacherId ? { teacherId } : {}),
      },
      order: { slotStartTime: 'ASC' },
    });
  }

  /** FR-P5-PP-03. Runs inside a transaction with a pessimistic write lock on the `PTMSlot` row —
   * the exact pattern `EventRegistrationService.register()` uses for its own capacity race — so
   * two parents booking the same slot at once can't both slip past a `status === 'available'`
   * check that was only true at read time. The loser gets a real 409, not a silent overwrite. */
  async book(slotId: string, dto: BookSlotDto, guardianId: string): Promise<PTMBookingEntity> {
    const link = await this.studentGuardianRepo.findOne({
      where: { studentId: dto.studentId, guardianId },
    });
    if (!link) {
      throw new ForbiddenException('You are not authorized to book on behalf of this student.');
    }

    const booking = await this.dataSource.transaction(async (manager) => {
      const slot = await manager.findOne(PTMSlotEntity, {
        where: { id: slotId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!slot) {
        throw new NotFoundException(`Slot ${slotId} not found.`);
      }
      if (slot.status !== PtmSlotStatus.AVAILABLE) {
        throw new ConflictException('This slot has already been booked.');
      }

      slot.status = PtmSlotStatus.BOOKED;
      await manager.save(slot);

      return manager.save(
        manager.create(PTMBookingEntity, {
          ptmSlotId: slotId,
          guardianId,
          studentId: dto.studentId,
          bookedAt: new Date(),
        }),
      );
    });

    await this.auditService.log({
      actorId: guardianId,
      action: 'ptm_book',
      targetType: 'ptm_booking',
      targetId: booking.id,
    });

    await this.notifyBookingParties(booking);

    return booking;
  }

  /** FR-P5-PP-05. Reopens the slot for someone else to book; only the teacher is notified — the
   * guardian initiated the cancellation themselves. */
  async cancel(bookingId: string, guardianId: string): Promise<PTMBookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found.`);
    }
    if (booking.guardianId !== guardianId) {
      throw new ForbiddenException('You are not authorized to cancel this booking.');
    }
    if (booking.status !== PtmBookingStatus.CONFIRMED) {
      throw new ConflictException('This booking has already been cancelled.');
    }

    const slot = await this.slotRepo.findOne({ where: { id: booking.ptmSlotId } });
    if (!slot) {
      throw new NotFoundException(`Slot ${booking.ptmSlotId} not found.`);
    }
    const event = await this.eventRepo.findOne({ where: { id: slot.ptmEventId } });
    const cutoffHours = event?.cancellationCutoffHours ?? 24;
    const cutoffTime = new Date(slot.slotStartTime.getTime() - cutoffHours * 60 * 60 * 1000);
    if (Date.now() > cutoffTime.getTime()) {
      throw new ForbiddenException(
        `This booking can no longer be cancelled — it is within ${cutoffHours} hour(s) of the meeting.`,
      );
    }

    booking.status = PtmBookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    await this.bookingRepo.save(booking);

    slot.status = PtmSlotStatus.AVAILABLE;
    await this.slotRepo.save(slot);

    await this.auditService.log({
      actorId: guardianId,
      action: 'ptm_cancel',
      targetType: 'ptm_booking',
      targetId: booking.id,
    });

    const teacher = await this.staffService.findById(slot.teacherId);
    const title = 'PTM Booking Cancelled';
    const message = `A parent has cancelled their ${slot.slotStartTime.toLocaleString()} slot — it is now open again.`;
    await Promise.allSettled([
      this.notificationService.createForStaff(teacher.id, title, message, 'ptm_cancelled'),
      this.smsService.sendSms(teacher.phone, message),
      teacher.pushToken ? this.pushService.sendPush(teacher.pushToken, title, message) : Promise.resolve(),
    ]);

    return booking;
  }

  async listMyBookings(guardianId: string): Promise<PTMBookingEntity[]> {
    return this.bookingRepo.find({ where: { guardianId }, order: { bookedAt: 'DESC' } });
  }

  private async notifyBookingParties(booking: PTMBookingEntity): Promise<void> {
    const slot = await this.slotRepo.findOne({ where: { id: booking.ptmSlotId } });
    if (!slot) return;
    const [guardian, student, teacher] = await Promise.all([
      this.guardianRepo.findOne({ where: { id: booking.guardianId } }),
      this.studentRepo.findOne({ where: { id: booking.studentId } }),
      this.staffService.findById(slot.teacherId),
    ]);

    const studentName = student ? `${student.firstName} ${student.lastName}` : 'your child';
    const guardianName = guardian ? `${guardian.firstName} ${guardian.lastName}` : 'A parent';
    const meetingTime = slot.slotStartTime.toLocaleString();

    const teacherTitle = 'PTM Booking Confirmed';
    const teacherMessage = `${guardianName} booked your ${meetingTime} slot to discuss ${studentName}.`;
    const guardianTitle = 'PTM Booking Confirmed';
    const guardianMessage = `Your meeting with ${teacher.firstName} ${teacher.lastName} about ${studentName} is confirmed for ${meetingTime}.`;

    await Promise.allSettled([
      this.notificationService.createForStaff(teacher.id, teacherTitle, teacherMessage, 'ptm_booked'),
      this.smsService.sendSms(teacher.phone, teacherMessage),
      teacher.pushToken ? this.pushService.sendPush(teacher.pushToken, teacherTitle, teacherMessage) : Promise.resolve(),
      guardian ? this.notificationService.createForGuardian(guardian.id, guardianTitle, guardianMessage, 'ptm_booked') : Promise.resolve(),
      guardian ? this.smsService.sendSms(guardian.phone, guardianMessage) : Promise.resolve(),
      guardian?.pushToken ? this.pushService.sendPush(guardian.pushToken, guardianTitle, guardianMessage) : Promise.resolve(),
    ]);
  }

  /** FR-P5-PP-07. No existing "remind N hours before a future timestamp" pattern exists anywhere
   * in this codebase (confirmed by research) — designed fresh. Runs every 15 minutes and catches
   * any confirmed booking whose meeting is now within the 24-hour window, rather than matching a
   * narrow tick-aligned window, so a booking can never be skipped due to timing — `reminderSentAt`
   * is the one-shot dedupe, same convention as `overstayAlertedAt` elsewhere in this session. */
  @Cron('*/15 * * * *')
  async sendReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const pendingBookings = await this.bookingRepo.find({
      where: { status: PtmBookingStatus.CONFIRMED, reminderSentAt: IsNull() },
    });
    if (pendingBookings.length === 0) return;

    const slots = await this.slotRepo.find({
      where: { id: In(pendingBookings.map((b) => b.ptmSlotId)) },
    });
    const slotById = new Map(slots.map((s) => [s.id, s]));

    const dueBookings = pendingBookings.filter((booking) => {
      const slot = slotById.get(booking.ptmSlotId);
      return slot && slot.slotStartTime > now && slot.slotStartTime <= windowEnd;
    });
    if (dueBookings.length === 0) return;

    const guardians = await this.guardianRepo.find({
      where: { id: In(dueBookings.map((b) => b.guardianId)) },
    });
    const students = await this.studentRepo.find({
      where: { id: In(dueBookings.map((b) => b.studentId)) },
    });
    const guardianById = new Map(guardians.map((g) => [g.id, g]));
    const studentById = new Map(students.map((s) => [s.id, s]));

    for (const booking of dueBookings) {
      const slot = slotById.get(booking.ptmSlotId)!;
      const guardian = guardianById.get(booking.guardianId);
      const student = studentById.get(booking.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : 'your child';
      const meetingTime = slot.slotStartTime.toLocaleString();

      const teacher = await this.staffService.findById(slot.teacherId);
      const guardianName = guardian ? `${guardian.firstName} ${guardian.lastName}` : 'the parent';

      const teacherTitle = 'PTM Reminder';
      const teacherMessage = `Reminder: your meeting with ${guardianName} about ${studentName} is tomorrow at ${meetingTime}.`;
      const guardianTitle = 'PTM Reminder';
      const guardianMessage = `Reminder: your meeting with ${teacher.firstName} ${teacher.lastName} about ${studentName} is tomorrow at ${meetingTime}.`;

      await Promise.allSettled([
        this.notificationService.createForStaff(teacher.id, teacherTitle, teacherMessage, 'ptm_reminder').catch(() => undefined),
        this.smsService.sendSms(teacher.phone, teacherMessage).catch(() => undefined),
        teacher.pushToken ? this.pushService.sendPush(teacher.pushToken, teacherTitle, teacherMessage).catch(() => undefined) : Promise.resolve(),
        guardian
          ? this.notificationService.createForGuardian(guardian.id, guardianTitle, guardianMessage, 'ptm_reminder').catch(() => undefined)
          : Promise.resolve(),
        guardian ? this.smsService.sendSms(guardian.phone, guardianMessage).catch(() => undefined) : Promise.resolve(),
        guardian?.pushToken
          ? this.pushService.sendPush(guardian.pushToken, guardianTitle, guardianMessage).catch(() => undefined)
          : Promise.resolve(),
      ]);

      booking.reminderSentAt = new Date();
      await this.bookingRepo.save(booking);
    }
  }
}
