import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { EventEntity, EventStatus } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { EventTicketEntity } from './entities/event-ticket.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';

export interface RegisterResult {
  registration: EventRegistrationEntity;
  ticket: EventTicketEntity | null;
}

export interface MyRegistrationRow {
  registration: EventRegistrationEntity;
  ticket: EventTicketEntity | null;
}

/** P5-EV-01 — FR-P5-EV-07/08/09/11. Registration is deliberately NOT audit-logged (routine,
 * high-volume, non-sensitive guardian self-service — matching MHA-133's own "operational vs.
 * compliance" audit-noise discipline; only staff-initiated Event lifecycle transitions in
 * EventService get audit entries). */
@Injectable()
export class EventRegistrationService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,

    @InjectRepository(EventRegistrationEntity)
    private readonly registrationRepo: Repository<EventRegistrationEntity>,

    @InjectRepository(EventTicketEntity)
    private readonly ticketRepo: Repository<EventTicketEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly studentGuardianRepo: Repository<StudentGuardianEntity>,

    private readonly dataSource: DataSource,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    private readonly notificationService: NotificationService,
  ) {}

  /** FR-P5-EV-07/08/09. Runs inside a transaction with a pessimistic write lock on the Event row
   * so two concurrent registrations against the same event can't both slip past a capacity/family
   * check that was only true at read time — the one place in this story with a genuine race
   * condition, unlike most CRUD elsewhere in this codebase. */
  async register(
    eventId: string,
    guardianId: string,
    studentId: string | undefined,
  ): Promise<RegisterResult> {
    if (studentId) {
      const link = await this.studentGuardianRepo.findOne({ where: { studentId, guardianId } });
      if (!link) {
        throw new ForbiddenException('You are not authorized to register on behalf of this student.');
      }
    }

    const { registration, ticket, event } = await this.dataSource.transaction(async (manager) => {
      const event = await manager.findOne(EventEntity, {
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event) {
        throw new NotFoundException(`Event ${eventId} not found.`);
      }
      if (event.status !== EventStatus.PUBLISHED) {
        throw new ConflictException('This event is not open for registration.');
      }

      const familyCount = await manager.count(EventRegistrationEntity, {
        where: {
          eventId,
          guardianId,
          status: In([EventRegistrationStatus.REGISTERED, EventRegistrationStatus.WAITLISTED]),
        },
      });
      if (familyCount >= event.ticketsPerFamily) {
        throw new UnprocessableEntityException(
          `You have already reached the maximum of ${event.ticketsPerFamily} ticket(s) per family for this event.`,
        );
      }

      const confirmedCount = await manager.count(EventRegistrationEntity, {
        where: { eventId, status: EventRegistrationStatus.REGISTERED },
      });

      const now = new Date();
      const isConfirmed = confirmedCount < event.capacity;

      let registration = manager.create(EventRegistrationEntity, {
        eventId,
        guardianId,
        studentId: studentId ?? null,
        status: isConfirmed ? EventRegistrationStatus.REGISTERED : EventRegistrationStatus.WAITLISTED,
        registeredAt: now,
        waitlistedAt: isConfirmed ? null : now,
      });
      registration = await manager.save(EventRegistrationEntity, registration);

      const ticket = isConfirmed ? await this.issueTicket(manager, registration) : null;

      return { registration, ticket, event };
    });

    const guardian = await this.guardianRepo.findOne({ where: { id: guardianId } });
    if (guardian) {
      if (ticket) {
        await this.dispatchToGuardian(
          guardian,
          'Registration Confirmed',
          `You're registered for ${event.name}. Your ticket is ready in the SIMS app.`,
        );
      } else {
        await this.dispatchToGuardian(
          guardian,
          'Added to Waiting List',
          `You've been added to the waiting list for ${event.name}. We'll notify you if a place opens.`,
        );
      }
    }

    return { registration, ticket };
  }

  /** FR-P5-EV-11. `guardianId` scopes the cancellation to the caller when set (guardian-initiated,
   * 403 if it isn't their own registration); `null` means a staff-initiated override (no ownership
   * check). Promotes the first waitlisted registration (FIFO) only when the cancelled row itself
   * held a confirmed spot — nothing opens up when a waitlisted entry is cancelled. */
  async cancelRegistration(registrationId: string, guardianId: string | null): Promise<EventRegistrationEntity> {
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!registration) {
      throw new NotFoundException(`Registration ${registrationId} not found.`);
    }
    if (guardianId && registration.guardianId !== guardianId) {
      throw new ForbiddenException('This is not your registration.');
    }
    if (registration.status === EventRegistrationStatus.CANCELLED) {
      throw new ConflictException('This registration is already cancelled.');
    }

    const wasConfirmed = registration.status === EventRegistrationStatus.REGISTERED;
    registration.status = EventRegistrationStatus.CANCELLED;
    registration.cancelledAt = new Date();
    const saved = await this.registrationRepo.save(registration);

    if (wasConfirmed) {
      await this.promoteNextWaitlisted(registration.eventId);
    }

    return saved;
  }

  // AC #94-adjacent: a guardian's "My Registrations" view needs each confirmed registration's
  // ticket inline (to render the QR image) without N follow-up requests — batch-fetched, same
  // "fetch separately + Map-join" convention already established throughout this codebase.
  async findMyRegistrations(guardianId: string): Promise<MyRegistrationRow[]> {
    const registrations = await this.registrationRepo.find({
      where: { guardianId },
      order: { createdAt: 'DESC' },
    });
    if (registrations.length === 0) return [];

    const tickets = await this.ticketRepo.find({
      where: { eventRegistrationId: In(registrations.map((r) => r.id)) },
    });
    const ticketByRegistrationId = new Map(tickets.map((t) => [t.eventRegistrationId, t]));

    return registrations.map((registration) => ({
      registration,
      ticket: ticketByRegistrationId.get(registration.id) ?? null,
    }));
  }

  private async promoteNextWaitlisted(eventId: string): Promise<void> {
    const next = await this.registrationRepo.findOne({
      where: { eventId, status: EventRegistrationStatus.WAITLISTED },
      order: { waitlistedAt: 'ASC' },
    });
    if (!next) return;

    next.status = EventRegistrationStatus.REGISTERED;
    const saved = await this.registrationRepo.save(next);
    await this.dataSource.transaction((manager) => this.issueTicket(manager, saved));

    const [event, guardian] = await Promise.all([
      this.eventRepo.findOne({ where: { id: eventId } }),
      this.guardianRepo.findOne({ where: { id: saved.guardianId } }),
    ]);
    if (event && guardian) {
      await this.dispatchToGuardian(
        guardian,
        'A Place Has Opened Up!',
        `Good news — a place has opened for ${event.name} and you're now registered. Your ticket is ready.`,
      );
    }
  }

  // Ticket id is pre-generated so the QR image (encoding that id, matching StudentEntity.qrCode's
  // exact precedent) can be produced in the same transaction as the insert.
  private async issueTicket(manager: EntityManager, registration: EventRegistrationEntity): Promise<EventTicketEntity> {
    const id = randomUUID();
    const qrCode = await QRCode.toDataURL(id, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
    const ticket = manager.create(EventTicketEntity, {
      id,
      eventRegistrationId: registration.id,
      qrCode,
      issuedAt: new Date(),
    });
    return manager.save(EventTicketEntity, ticket);
  }

  private async dispatchToGuardian(guardian: GuardianEntity, title: string, body: string): Promise<void> {
    await Promise.allSettled([
      this.smsService.sendSms(guardian.phone, body),
      guardian.pushToken ? this.pushService.sendPush(guardian.pushToken, title, body) : Promise.resolve(),
      this.notificationService.createForGuardian(guardian.id, title, body, 'event'),
    ]);
  }
}
