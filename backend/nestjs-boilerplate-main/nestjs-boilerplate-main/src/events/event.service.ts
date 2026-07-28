import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEntity, EventStatus } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { AuditService } from '../audit/audit.service';
import { TargetedMessageService } from '../communication/targeted-message.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';

/** P5-EV-01 — FR-P5-EV-01/04/05/06. Event lifecycle (draft -> published -> cancelled), mirroring
 * MhaSessionEntity's status-guard-then-audit-log pattern (the fuller precedent, vs.
 * CounselorCaseEntity.closeCase()'s audit-less version). Only staff-initiated lifecycle
 * transitions are audit-logged — routine guardian registration/cancellation isn't, matching
 * MHA-133's own "operational vs. compliance" audit-noise discipline. */
@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,

    @InjectRepository(EventRegistrationEntity)
    private readonly registrationRepo: Repository<EventRegistrationEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    private readonly auditService: AuditService,
    private readonly targetedMessageService: TargetedMessageService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateEventDto, actorStaffId: string): Promise<EventEntity> {
    const event = this.eventRepo.create({ ...dto, createdByStaffId: actorStaffId, status: EventStatus.DRAFT });
    const saved = await this.eventRepo.save(event);
    await this.auditService.log({
      actorId: actorStaffId,
      action: 'create_event',
      targetType: 'event',
      targetId: saved.id,
    });
    return saved;
  }

  async getById(id: string): Promise<EventEntity> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found.`);
    }
    return event;
  }

  /** FR-MHA-30-style broad read (mirrors MhaSessionController's findAll) — every status, for
   * admin/principal management. */
  async findAll(): Promise<EventEntity[]> {
    return this.eventRepo.find({ order: { date: 'DESC' } });
  }

  /** FR-P5-EV-03/04 — "only published events are visible to parents/students." Cancelled events
   * stay visible too (a guardian who was registered still needs to see it was cancelled), draft
   * events never appear here. */
  async findPublished(): Promise<EventEntity[]> {
    return this.eventRepo.find({
      where: [{ status: EventStatus.PUBLISHED }, { status: EventStatus.CANCELLED }],
      order: { date: 'DESC' },
    });
  }

  /** FR-P5-EV-04/05. On publish: draft->published, then notify every guardian in the school
   * (the AI prompt's Event model has no audience-targeting field, so "relevant parents" reads as
   * "all parents" — the simplest AC-literal interpretation; FR-P5-EV-05's grade/staff-scoped
   * targeting is real future scope, not built here). */
  async publish(id: string, actorStaffId: string): Promise<EventEntity> {
    const event = await this.getById(id);
    if (event.status !== EventStatus.DRAFT) {
      throw new ConflictException(`Event ${id} is not in draft status.`);
    }
    event.status = EventStatus.PUBLISHED;
    event.publishedAt = new Date();
    const saved = await this.eventRepo.save(event);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'publish_event',
      targetType: 'event',
      targetId: saved.id,
    });

    await this.notifyAllParents(saved);
    return saved;
  }

  /** FR-P5-EV-06. Cancels the event and every non-cancelled registration; notifies only guardians
   * whose registration had a confirmed spot (status: registered) — a waitlisted guardian never
   * had one to lose, matching AC #6's literal "auto-notifies all REGISTERED parents". */
  async cancel(id: string, actorStaffId: string): Promise<EventEntity> {
    const event = await this.getById(id);
    if (event.status === EventStatus.CANCELLED) {
      throw new ConflictException(`Event ${id} is already cancelled.`);
    }
    event.status = EventStatus.CANCELLED;
    event.cancelledAt = new Date();
    const saved = await this.eventRepo.save(event);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'cancel_event',
      targetType: 'event',
      targetId: saved.id,
    });

    const registrations = await this.registrationRepo.find({
      where: [
        { eventId: id, status: EventRegistrationStatus.REGISTERED },
        { eventId: id, status: EventRegistrationStatus.WAITLISTED },
      ],
    });
    const toNotify = registrations.filter((r) => r.status === EventRegistrationStatus.REGISTERED);

    const now = new Date();
    for (const r of registrations) {
      r.status = EventRegistrationStatus.CANCELLED;
      r.cancelledAt = now;
    }
    if (registrations.length > 0) {
      await this.registrationRepo.save(registrations);
    }

    if (toNotify.length > 0) {
      const guardians = await this.guardianRepo.find({
        where: { id: In(toNotify.map((r) => r.guardianId)) },
      });
      const title = 'Event Cancelled';
      const body = `${saved.name} on ${saved.date} has been cancelled. We apologise for any inconvenience.`;
      await Promise.allSettled(guardians.map((g) => this.dispatchToGuardian(g, title, body)));
    }

    return saved;
  }

  private async notifyAllParents(event: EventEntity): Promise<void> {
    const recipients = await this.targetedMessageService.resolveRecipients({ allParents: true });
    if (recipients.length === 0) return;

    const guardians = await this.guardianRepo.find({
      where: { id: In(recipients.map((r) => r.id)) },
    });
    const title = 'New School Event';
    const body = `${event.name} on ${event.date} at ${event.venue}. Register now via the SIMS app.`;
    await Promise.allSettled(guardians.map((g) => this.dispatchToGuardian(g, title, body)));
  }

  // Mirrors absence-notification.listener.ts / mha-parent-notification.service.ts's established
  // dispatch shape: always SMS, push only if a token exists, plus an in-app copy — each channel
  // independent so one failure never blocks another.
  private async dispatchToGuardian(guardian: GuardianEntity, title: string, body: string): Promise<void> {
    await Promise.allSettled([
      this.smsService.sendSms(guardian.phone, body),
      guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, body) : Promise.resolve(),
      this.notificationService.createForGuardian(guardian.id, title, body, 'event'),
    ]);
  }
}
