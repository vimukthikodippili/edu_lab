import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EventService } from './event.service';
import { EventEntity, EventStatus, EventType } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { AuditService } from '../audit/audit.service';
import { TargetedMessageService } from '../communication/targeted-message.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const EVENT_ID = 'event-1';
const ACTOR_STAFF_ID = 'staff-1';

function buildEvent(overrides: Partial<EventEntity> = {}): EventEntity {
  return {
    id: EVENT_ID,
    name: 'Sports Day',
    eventType: EventType.SPORTS_DAY,
    date: '2026-09-15',
    startTime: '08:00',
    endTime: '13:00',
    venue: 'Main Grounds',
    description: null,
    capacity: 100,
    ticketsPerFamily: 2,
    status: EventStatus.DRAFT,
    createdByStaffId: ACTOR_STAFF_ID,
    publishedAt: null,
    cancelledAt: null,
    ...overrides,
  } as EventEntity;
}

function buildRegistration(overrides: Partial<EventRegistrationEntity> = {}): EventRegistrationEntity {
  return {
    id: 'reg-1',
    eventId: EVENT_ID,
    guardianId: 'guardian-1',
    studentId: null,
    status: EventRegistrationStatus.REGISTERED,
    registeredAt: new Date(),
    waitlistedAt: null,
    cancelledAt: null,
    ...overrides,
  } as EventRegistrationEntity;
}

describe('EventService', () => {
  let service: EventService;
  let eventRepo: MockRepo<EventEntity>;
  let registrationRepo: MockRepo<EventRegistrationEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let auditService: { log: jest.Mock };
  let targetedMessageService: { resolveRecipients: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let notificationService: { createForGuardian: jest.Mock };

  beforeEach(async () => {
    eventRepo = repoMock<EventEntity>();
    registrationRepo = repoMock<EventRegistrationEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    targetedMessageService = { resolveRecipients: jest.fn().mockResolvedValue([]) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForGuardian: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepo },
        { provide: getRepositoryToken(EventRegistrationEntity), useValue: registrationRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: AuditService, useValue: auditService },
        { provide: TargetedMessageService, useValue: targetedMessageService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(EventService);
  });

  describe('create', () => {
    it('creates a draft event and logs a create_event audit entry', async () => {
      const dto = { name: 'Sports Day', eventType: EventType.SPORTS_DAY, date: '2026-09-15', startTime: '08:00', endTime: '13:00', venue: 'Main Grounds', capacity: 100, ticketsPerFamily: 2 };
      const result = await service.create(dto, ACTOR_STAFF_ID);

      expect(result).toEqual(expect.objectContaining({ status: EventStatus.DRAFT, createdByStaffId: ACTOR_STAFF_ID }));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: ACTOR_STAFF_ID, action: 'create_event', targetType: 'event' }),
      );
    });
  });

  describe('publish', () => {
    it('transitions draft -> published, logs the audit entry, and notifies all resolved parents', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: EventStatus.DRAFT }));
      targetedMessageService.resolveRecipients.mockResolvedValue([{ type: 'parent', id: 'guardian-1', name: 'Kamal', phone: '077', email: null, pushToken: null }]);
      (guardianRepo.find as jest.Mock).mockResolvedValue([{ id: 'guardian-1', firstName: 'Kamal', lastName: 'Perera', phone: '077', pushToken: null }]);

      const result = await service.publish(EVENT_ID, ACTOR_STAFF_ID);

      expect(result.status).toBe(EventStatus.PUBLISHED);
      expect(result.publishedAt).toBeInstanceOf(Date);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'publish_event', targetType: 'event', targetId: EVENT_ID }),
      );
      expect(targetedMessageService.resolveRecipients).toHaveBeenCalledWith({ allParents: true });
      expect(smsService.sendSms).toHaveBeenCalledWith('077', expect.stringContaining('Sports Day'));
    });

    it('throws 409 when the event is not in draft status', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: EventStatus.PUBLISHED }));
      await expect(service.publish(EVENT_ID, ACTOR_STAFF_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('cancels every non-cancelled registration and notifies only guardians who had a confirmed spot', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: EventStatus.PUBLISHED }));
      const confirmed = buildRegistration({ id: 'r1', guardianId: 'guardian-confirmed', status: EventRegistrationStatus.REGISTERED });
      const waitlisted = buildRegistration({ id: 'r2', guardianId: 'guardian-waitlisted', status: EventRegistrationStatus.WAITLISTED });
      (registrationRepo.find as jest.Mock).mockResolvedValue([confirmed, waitlisted]);
      (guardianRepo.find as jest.Mock).mockResolvedValue([{ id: 'guardian-confirmed', firstName: 'A', lastName: 'B', phone: '077', pushToken: null }]);

      const result = await service.cancel(EVENT_ID, ACTOR_STAFF_ID);

      expect(result.status).toBe(EventStatus.CANCELLED);
      expect(registrationRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'r1', status: EventRegistrationStatus.CANCELLED }),
        expect.objectContaining({ id: 'r2', status: EventRegistrationStatus.CANCELLED }),
      ]);
      // Only the confirmed guardian's id is looked up for notification — the waitlisted one never
      // had a spot to lose (AC's literal "all REGISTERED parents").
      expect(guardianRepo.find).toHaveBeenCalledWith({ where: { id: expect.anything() } });
      expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    });

    it('throws 409 when the event is already cancelled', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: EventStatus.CANCELLED }));
      await expect(service.cancel(EVENT_ID, ACTOR_STAFF_ID)).rejects.toThrow(ConflictException);
    });
  });
});
