import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { EventRegistrationService } from './event-registration.service';
import { EventEntity, EventStatus, EventType } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { EventTicketEntity } from './entities/event-ticket.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const EVENT_ID = 'event-1';
const GUARDIAN_ID = 'guardian-1';

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
    capacity: 2,
    ticketsPerFamily: 1,
    status: EventStatus.PUBLISHED,
    createdByStaffId: 'staff-1',
    publishedAt: new Date(),
    cancelledAt: null,
    ...overrides,
  } as EventEntity;
}

function buildRegistration(overrides: Partial<EventRegistrationEntity> = {}): EventRegistrationEntity {
  return {
    id: 'reg-1',
    eventId: EVENT_ID,
    guardianId: GUARDIAN_ID,
    studentId: null,
    status: EventRegistrationStatus.REGISTERED,
    registeredAt: new Date(),
    waitlistedAt: null,
    cancelledAt: null,
    ...overrides,
  } as EventRegistrationEntity;
}

function buildGuardian(overrides: Partial<GuardianEntity> = {}): GuardianEntity {
  return { id: GUARDIAN_ID, firstName: 'Kamal', lastName: 'Perera', phone: '0771234567', pushToken: null, ...overrides } as GuardianEntity;
}

// Mocks the EntityManager passed into dataSource.transaction()'s callback. `count` responses are
// consumed in the exact order the service calls them (family-limit check, then capacity check).
function buildManagerMock(countSequence: number[]) {
  let countCall = 0;
  return {
    findOne: jest.fn().mockResolvedValue(buildEvent()),
    count: jest.fn(() => Promise.resolve(countSequence[countCall++] ?? 0)),
    create: jest.fn((_entityClass: unknown, data: object) => ({ ...data })),
    save: jest.fn((_entityClass: unknown, data: { id?: string }) =>
      Promise.resolve({ id: data.id ?? 'generated-id', ...data }),
    ),
  };
}

describe('EventRegistrationService', () => {
  let service: EventRegistrationService;
  let eventRepo: MockRepo<EventEntity>;
  let registrationRepo: MockRepo<EventRegistrationEntity>;
  let ticketRepo: MockRepo<EventTicketEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let studentGuardianRepo: MockRepo<StudentGuardianEntity>;
  let dataSource: { transaction: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let notificationService: { createForGuardian: jest.Mock };

  beforeEach(async () => {
    eventRepo = repoMock<EventEntity>();
    registrationRepo = repoMock<EventRegistrationEntity>();
    ticketRepo = repoMock<EventTicketEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    studentGuardianRepo = repoMock<StudentGuardianEntity>();
    dataSource = { transaction: jest.fn() };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForGuardian: jest.fn().mockResolvedValue(undefined) };

    (guardianRepo.findOne as jest.Mock).mockResolvedValue(buildGuardian());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepo },
        { provide: getRepositoryToken(EventRegistrationEntity), useValue: registrationRepo },
        { provide: getRepositoryToken(EventTicketEntity), useValue: ticketRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: studentGuardianRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(EventRegistrationService);
  });

  describe('register — capacity enforcement (AI-prompt test)', () => {
    it('issues a ticket and sets status registered when confirmed count is below capacity', async () => {
      const manager = buildManagerMock([0, 1]); // familyCount=0, confirmedCount=1 (capacity=2)
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      const result = await service.register(EVENT_ID, GUARDIAN_ID, undefined);

      expect(result.registration.status).toBe(EventRegistrationStatus.REGISTERED);
      expect(result.ticket).not.toBeNull();
      expect(manager.save).toHaveBeenCalledWith(EventTicketEntity, expect.objectContaining({ qrCode: expect.any(String) }));
    });

    it('waitlists with no ticket when confirmed count has reached capacity', async () => {
      const manager = buildManagerMock([0, 2]); // familyCount=0, confirmedCount=2 (capacity=2, full)
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      const result = await service.register(EVENT_ID, GUARDIAN_ID, undefined);

      expect(result.registration.status).toBe(EventRegistrationStatus.WAITLISTED);
      expect(result.ticket).toBeNull();
      expect(manager.save).not.toHaveBeenCalledWith(EventTicketEntity, expect.anything());
    });
  });

  describe('register — ticket-per-family limit (AI-prompt test)', () => {
    it('rejects with 422 before any capacity/waitlist logic when the family limit is already reached', async () => {
      const manager = buildManagerMock([1]); // familyCount=1 (ticketsPerFamily=1) — limit already reached
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      await expect(service.register(EVENT_ID, GUARDIAN_ID, undefined)).rejects.toThrow(UnprocessableEntityException);
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.count).toHaveBeenCalledTimes(1); // never reached the confirmedCount/capacity check
    });
  });

  describe('register — guards', () => {
    it('throws 403 when studentId is not linked to the calling guardian', async () => {
      (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue(undefined);

      await expect(service.register(EVENT_ID, GUARDIAN_ID, 'not-my-student')).rejects.toThrow(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws 404 when the event does not exist', async () => {
      const manager = buildManagerMock([]);
      manager.findOne = jest.fn().mockResolvedValue(undefined);
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      await expect(service.register(EVENT_ID, GUARDIAN_ID, undefined)).rejects.toThrow(NotFoundException);
    });

    it('throws 409 when the event is not published', async () => {
      const manager = buildManagerMock([]);
      manager.findOne = jest.fn().mockResolvedValue(buildEvent({ status: EventStatus.DRAFT }));
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      await expect(service.register(EVENT_ID, GUARDIAN_ID, undefined)).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelRegistration — waitlist promotion (AI-prompt test)', () => {
    it('promotes the first waitlisted registration (FIFO) and issues its ticket when a confirmed registration is cancelled', async () => {
      const confirmed = buildRegistration({ id: 'reg-confirmed', status: EventRegistrationStatus.REGISTERED });
      const nextWaitlisted = buildRegistration({
        id: 'reg-waitlisted',
        guardianId: 'guardian-2',
        status: EventRegistrationStatus.WAITLISTED,
        waitlistedAt: new Date('2026-07-01T00:00:00.000Z'),
      });

      (registrationRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(confirmed) // the registration being cancelled
        .mockResolvedValueOnce(nextWaitlisted); // promoteNextWaitlisted's lookup

      const manager = buildManagerMock([]);
      dataSource.transaction.mockImplementation((cb) => cb(manager));
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent());
      (guardianRepo.findOne as jest.Mock).mockResolvedValue(buildGuardian({ id: 'guardian-2' }));

      const result = await service.cancelRegistration('reg-confirmed', GUARDIAN_ID);

      expect(result.status).toBe(EventRegistrationStatus.CANCELLED);
      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'reg-waitlisted', status: EventRegistrationStatus.REGISTERED }),
      );
      expect(manager.save).toHaveBeenCalledWith(EventTicketEntity, expect.objectContaining({ qrCode: expect.any(String) }));
      expect(smsService.sendSms).toHaveBeenCalled();
    });

    it('does not attempt promotion when the cancelled registration was itself waitlisted', async () => {
      const waitlisted = buildRegistration({ id: 'reg-waitlisted', status: EventRegistrationStatus.WAITLISTED });
      (registrationRepo.findOne as jest.Mock).mockResolvedValueOnce(waitlisted);

      const result = await service.cancelRegistration('reg-waitlisted', GUARDIAN_ID);

      expect(result.status).toBe(EventRegistrationStatus.CANCELLED);
      expect(registrationRepo.findOne).toHaveBeenCalledTimes(1); // no second lookup for a waitlist candidate
      expect(dataSource.transaction).not.toHaveBeenCalled(); // no ticket issuance attempted
    });

    it('throws 403 when a guardian tries to cancel a registration that is not their own', async () => {
      (registrationRepo.findOne as jest.Mock).mockResolvedValueOnce(buildRegistration({ guardianId: 'someone-else' }));
      await expect(service.cancelRegistration('reg-1', GUARDIAN_ID)).rejects.toThrow(ForbiddenException);
    });

    it('throws 409 when the registration is already cancelled', async () => {
      (registrationRepo.findOne as jest.Mock).mockResolvedValueOnce(
        buildRegistration({ status: EventRegistrationStatus.CANCELLED }),
      );
      await expect(service.cancelRegistration('reg-1', GUARDIAN_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findMyRegistrations', () => {
    it('joins each registration with its ticket (null for waitlisted rows with no ticket)', async () => {
      const confirmed = buildRegistration({ id: 'reg-confirmed', status: EventRegistrationStatus.REGISTERED });
      const waitlisted = buildRegistration({ id: 'reg-waitlisted', status: EventRegistrationStatus.WAITLISTED });
      (registrationRepo.find as jest.Mock).mockResolvedValue([confirmed, waitlisted]);
      (ticketRepo.find as jest.Mock).mockResolvedValue([
        { id: 'ticket-1', eventRegistrationId: 'reg-confirmed', qrCode: 'data:image/png;base64,x', issuedAt: new Date() },
      ]);

      const result = await service.findMyRegistrations(GUARDIAN_ID);

      expect(result).toEqual([
        { registration: confirmed, ticket: expect.objectContaining({ id: 'ticket-1' }) },
        { registration: waitlisted, ticket: null },
      ]);
    });

    it('returns [] without querying tickets when there are no registrations', async () => {
      (registrationRepo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.findMyRegistrations(GUARDIAN_ID);
      expect(result).toEqual([]);
      expect(ticketRepo.find).not.toHaveBeenCalled();
    });
  });
});
