import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EventAttendanceService } from './event-attendance.service';
import { EventEntity, EventStatus, EventType } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { EventTicketEntity } from './entities/event-ticket.entity';
import { EventAttendanceEntity } from './entities/event-attendance.entity';
import { EventStudentParticipantEntity } from './entities/event-student-participant.entity';
import { EventStudentAttendanceEntity } from './entities/event-student-attendance.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const EVENT_ID = 'event-1';
const STAFF_ID = 'staff-1';

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
    createdByStaffId: STAFF_ID,
    publishedAt: new Date(),
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

function buildTicket(overrides: Partial<EventTicketEntity> = {}): EventTicketEntity {
  return { id: 'ticket-1', eventRegistrationId: 'reg-1', qrCode: 'data:image/png;base64,x', issuedAt: new Date(), ...overrides } as EventTicketEntity;
}

function buildParticipant(overrides: Partial<EventStudentParticipantEntity> = {}): EventStudentParticipantEntity {
  return {
    id: 'participant-1',
    eventId: EVENT_ID,
    studentId: 'student-1',
    addedByStaffId: STAFF_ID,
    qrCode: 'data:image/png;base64,y',
    issuedAt: new Date(),
    ...overrides,
  } as EventStudentParticipantEntity;
}

describe('EventAttendanceService', () => {
  let service: EventAttendanceService;
  let eventRepo: MockRepo<EventEntity>;
  let registrationRepo: MockRepo<EventRegistrationEntity>;
  let ticketRepo: MockRepo<EventTicketEntity>;
  let attendanceRepo: MockRepo<EventAttendanceEntity>;
  let participantRepo: MockRepo<EventStudentParticipantEntity>;
  let studentAttendanceRepo: MockRepo<EventStudentAttendanceEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let classSectionRepo: MockRepo<ClassSectionEntity>;

  beforeEach(async () => {
    eventRepo = repoMock<EventEntity>();
    registrationRepo = repoMock<EventRegistrationEntity>();
    ticketRepo = repoMock<EventTicketEntity>();
    attendanceRepo = repoMock<EventAttendanceEntity>();
    participantRepo = repoMock<EventStudentParticipantEntity>();
    studentAttendanceRepo = repoMock<EventStudentAttendanceEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    studentRepo = repoMock<StudentEntity>();
    classSectionRepo = repoMock<ClassSectionEntity>();

    (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventAttendanceService,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepo },
        { provide: getRepositoryToken(EventRegistrationEntity), useValue: registrationRepo },
        { provide: getRepositoryToken(EventTicketEntity), useValue: ticketRepo },
        { provide: getRepositoryToken(EventAttendanceEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(EventStudentParticipantEntity), useValue: participantRepo },
        { provide: getRepositoryToken(EventStudentAttendanceEntity), useValue: studentAttendanceRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
      ],
    }).compile();

    service = module.get(EventAttendanceService);
  });

  describe('scanCode — guardian ticket', () => {
    it('checks in a valid ticket and returns guest + child name', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(buildTicket());
      (registrationRepo.findOne as jest.Mock).mockResolvedValue(buildRegistration({ studentId: 'student-1' }));
      (attendanceRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      (guardianRepo.findOne as jest.Mock).mockResolvedValue({ firstName: 'Kamal', lastName: 'Perera' });
      (studentRepo.findOne as jest.Mock).mockResolvedValue({ firstName: 'Nimal', lastName: 'Perera' });

      const result = await service.scanCode(EVENT_ID, 'ticket-1', STAFF_ID);

      expect(result).toEqual(expect.objectContaining({ type: 'guardian', guestName: 'Kamal Perera', childName: 'Nimal Perera' }));
      expect(attendanceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ eventTicketId: 'ticket-1', scannedById: STAFF_ID }));
    });

    it('duplicate scan rejection (AI-prompt test): rejects a second scan of the same ticket', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(buildTicket());
      (registrationRepo.findOne as jest.Mock).mockResolvedValue(buildRegistration());
      (attendanceRepo.findOne as jest.Mock).mockResolvedValue({ id: 'att-1', eventTicketId: 'ticket-1', scannedAt: new Date(), scannedById: STAFF_ID });

      await expect(service.scanCode(EVENT_ID, 'ticket-1', STAFF_ID)).rejects.toThrow(ConflictException);
      expect(attendanceRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a ticket belonging to a different event', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(buildTicket());
      (registrationRepo.findOne as jest.Mock).mockResolvedValue(buildRegistration({ eventId: 'other-event' }));

      await expect(service.scanCode(EVENT_ID, 'ticket-1', STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('rejects a ticket whose registration has been cancelled', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(buildTicket());
      (registrationRepo.findOne as jest.Mock).mockResolvedValue(buildRegistration({ status: EventRegistrationStatus.CANCELLED }));

      await expect(service.scanCode(EVENT_ID, 'ticket-1', STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('rejects when the event itself is cancelled', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: EventStatus.CANCELLED }));

      await expect(service.scanCode(EVENT_ID, 'ticket-1', STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('rejects an unknown code with 404', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      (participantRepo.findOne as jest.Mock).mockResolvedValue(undefined);

      await expect(service.scanCode(EVENT_ID, 'not-a-real-code', STAFF_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('scanCode — student participant', () => {
    it('checks in a valid participant QR and returns student + class name', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      (participantRepo.findOne as jest.Mock).mockResolvedValue(buildParticipant());
      (studentAttendanceRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      (studentRepo.findOne as jest.Mock).mockResolvedValue({ firstName: 'Nimal', lastName: 'Perera', classSectionId: 10 });
      (classSectionRepo.findOne as jest.Mock).mockResolvedValue({ id: 10, name: '10A' });

      const result = await service.scanCode(EVENT_ID, 'participant-1', STAFF_ID);

      expect(result).toEqual(expect.objectContaining({ type: 'student', studentName: 'Nimal Perera', className: '10A' }));
      expect(studentAttendanceRepo.save).toHaveBeenCalledWith(expect.objectContaining({ eventStudentParticipantId: 'participant-1', method: 'qr_scan' }));
    });

    it('duplicate scan rejection for a student participant', async () => {
      (ticketRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      (participantRepo.findOne as jest.Mock).mockResolvedValue(buildParticipant());
      (studentAttendanceRepo.findOne as jest.Mock).mockResolvedValue({ id: 'att-1', eventStudentParticipantId: 'participant-1', scannedAt: new Date() });

      await expect(service.scanCode(EVENT_ID, 'participant-1', STAFF_ID)).rejects.toThrow(ConflictException);
      expect(studentAttendanceRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getDashboard — live count aggregation (AI-prompt test)', () => {
    it.each([
      { registered: 2, checkedIn: 0, expectNoShow: 2 },
      { registered: 2, checkedIn: 1, expectNoShow: 1 },
      { registered: 2, checkedIn: 2, expectNoShow: 0 },
      { registered: 1, checkedIn: 2, expectNoShow: 0 }, // floor-at-zero edge case
    ])('registered=$registered checkedIn=$checkedIn -> noShow=$expectNoShow', async ({ registered, checkedIn, expectNoShow }) => {
      (registrationRepo.count as jest.Mock).mockResolvedValue(registered);
      const registrationCount = Math.max(registered, checkedIn);
      const registrations = Array.from({ length: registrationCount }, (_, i) => buildRegistration({ id: `reg-${i}` }));
      (registrationRepo.find as jest.Mock).mockResolvedValue(registrations);
      const tickets = registrations.map((r, i) => buildTicket({ id: `ticket-${i}`, eventRegistrationId: r.id }));
      (ticketRepo.find as jest.Mock).mockResolvedValue(tickets);
      (attendanceRepo.count as jest.Mock).mockResolvedValue(checkedIn);
      (participantRepo.find as jest.Mock).mockResolvedValue([]);

      const dashboard = await service.getDashboard(EVENT_ID);

      expect(dashboard.capacity).toBe(2);
      expect(dashboard.registeredCount).toBe(registered);
      expect(dashboard.checkedInCount).toBe(checkedIn);
      expect(dashboard.noShowCount).toBe(expectNoShow);
    });

    it('includes student participation counts alongside guardian counts', async () => {
      (registrationRepo.count as jest.Mock).mockResolvedValue(0);
      (registrationRepo.find as jest.Mock).mockResolvedValue([]);
      const participants = [buildParticipant({ id: 'p-1' }), buildParticipant({ id: 'p-2' })];
      (participantRepo.find as jest.Mock).mockResolvedValue(participants);
      (studentAttendanceRepo.count as jest.Mock).mockResolvedValue(1);

      const dashboard = await service.getDashboard(EVENT_ID);

      expect(dashboard.participantsExpectedCount).toBe(2);
      expect(dashboard.participantsCheckedInCount).toBe(1);
    });
  });
});
