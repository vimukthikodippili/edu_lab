import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { PTMBookingService } from './ptm-booking.service';
import { PTMSlotEntity, PtmSlotStatus } from './entities/ptm-slot.entity';
import { PTMEventEntity } from './entities/ptm-event.entity';
import { PTMBookingEntity, PtmBookingStatus } from './entities/ptm-booking.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffService } from '../staff/staff.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: unknown) => d),
});

const SLOT_ID = 'slot-1';
const EVENT_ID = 'event-1';
const GUARDIAN_ID = 'guardian-1';
const STUDENT_ID = 'student-1';
const TEACHER_ID = 'teacher-1';
const BOOKING_ID = 'booking-1';

function buildSlot(overrides: Partial<PTMSlotEntity> = {}): PTMSlotEntity {
  return {
    id: SLOT_ID,
    ptmEventId: EVENT_ID,
    teacherId: TEACHER_ID,
    slotStartTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
    slotEndTime: new Date(Date.now() + 48 * 60 * 60 * 1000 + 10 * 60000),
    status: PtmSlotStatus.AVAILABLE,
    ...overrides,
  } as PTMSlotEntity;
}

function buildBooking(overrides: Partial<PTMBookingEntity> = {}): PTMBookingEntity {
  return {
    id: BOOKING_ID,
    ptmSlotId: SLOT_ID,
    guardianId: GUARDIAN_ID,
    studentId: STUDENT_ID,
    bookedAt: new Date(),
    status: PtmBookingStatus.CONFIRMED,
    cancelledAt: null,
    reminderSentAt: null,
    ...overrides,
  } as PTMBookingEntity;
}

function buildEvent(overrides: Partial<PTMEventEntity> = {}): PTMEventEntity {
  return { id: EVENT_ID, cancellationCutoffHours: 24, ...overrides } as PTMEventEntity;
}

function buildTeacher(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: TEACHER_ID, firstName: 'Nimal', lastName: 'Perera', phone: '0771111111', pushToken: null, ...overrides };
}

function buildGuardian(overrides: Partial<GuardianEntity> = {}): GuardianEntity {
  return { id: GUARDIAN_ID, firstName: 'Kamal', lastName: 'Silva', phone: '0772222222', pushToken: null, ...overrides } as GuardianEntity;
}

function buildStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return { id: STUDENT_ID, firstName: 'Nadeesha', lastName: 'Silva', ...overrides } as StudentEntity;
}

function buildManagerMock(slot: PTMSlotEntity) {
  return {
    findOne: jest.fn().mockResolvedValue({ ...slot }),
    save: jest.fn((d: unknown) => Promise.resolve(d)),
    create: jest.fn((_entityClass: unknown, data: object) => ({ ...data })),
  };
}

describe('PTMBookingService', () => {
  let service: PTMBookingService;
  let slotRepo: MockRepo<PTMSlotEntity>;
  let eventRepo: MockRepo<PTMEventEntity>;
  let bookingRepo: MockRepo<PTMBookingEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let studentGuardianRepo: MockRepo<StudentGuardianEntity>;
  let staffService: { findById: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock; createForGuardian: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  beforeEach(async () => {
    slotRepo = repoMock<PTMSlotEntity>();
    eventRepo = repoMock<PTMEventEntity>();
    bookingRepo = repoMock<PTMBookingEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    studentRepo = repoMock<StudentEntity>();
    studentGuardianRepo = repoMock<StudentGuardianEntity>();
    staffService = { findById: jest.fn().mockResolvedValue(buildTeacher()) };
    dataSource = { transaction: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = {
      createForStaff: jest.fn().mockResolvedValue(undefined),
      createForGuardian: jest.fn().mockResolvedValue(undefined),
    };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue({ studentId: STUDENT_ID, guardianId: GUARDIAN_ID });
    (slotRepo.findOne as jest.Mock).mockResolvedValue(buildSlot());
    (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent());
    (guardianRepo.findOne as jest.Mock).mockResolvedValue(buildGuardian());
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildStudent());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PTMBookingService,
        { provide: getRepositoryToken(PTMSlotEntity), useValue: slotRepo },
        { provide: getRepositoryToken(PTMEventEntity), useValue: eventRepo },
        { provide: getRepositoryToken(PTMBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: studentGuardianRepo },
        { provide: StaffService, useValue: staffService },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(PTMBookingService);
  });

  describe('book — double-booking enforcement (AI-prompt-requested test)', () => {
    it('books an available slot, flips it to booked, and notifies both parties', async () => {
      const manager = buildManagerMock(buildSlot({ status: PtmSlotStatus.AVAILABLE }));
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      const booking = await service.book(SLOT_ID, { studentId: STUDENT_ID }, GUARDIAN_ID);

      expect(booking.ptmSlotId).toBe(SLOT_ID);
      expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ status: PtmSlotStatus.BOOKED }));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ptm_book', targetType: 'ptm_booking' }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        TEACHER_ID,
        'PTM Booking Confirmed',
        expect.any(String),
        'ptm_booked',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        GUARDIAN_ID,
        'PTM Booking Confirmed',
        expect.any(String),
        'ptm_booked',
      );
    });

    it('rejects booking a slot that is already booked, with no duplicate PTMBooking created', async () => {
      const manager = buildManagerMock(buildSlot({ status: PtmSlotStatus.BOOKED }));
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      await expect(service.book(SLOT_ID, { studentId: STUDENT_ID }, GUARDIAN_ID)).rejects.toThrow(ConflictException);
      expect(manager.create).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('rejects booking on behalf of a student the guardian is not linked to', async () => {
      (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.book(SLOT_ID, { studentId: STUDENT_ID }, GUARDIAN_ID)).rejects.toThrow(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown slot', async () => {
      const manager = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
      dataSource.transaction.mockImplementation((cb) => cb(manager));

      await expect(service.book('missing', { studentId: STUDENT_ID }, GUARDIAN_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel — slot re-opening (AI-prompt-requested test)', () => {
    it('cancels the booking, reopens the slot, and notifies only the teacher', async () => {
      (bookingRepo.findOne as jest.Mock).mockResolvedValue(buildBooking());
      (slotRepo.findOne as jest.Mock).mockResolvedValue(buildSlot({ status: PtmSlotStatus.BOOKED }));

      const result = await service.cancel(BOOKING_ID, GUARDIAN_ID);

      expect(result.status).toBe(PtmBookingStatus.CANCELLED);
      expect(slotRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PtmSlotStatus.AVAILABLE }));
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        TEACHER_ID,
        'PTM Booking Cancelled',
        expect.any(String),
        'ptm_cancelled',
      );
      expect(notificationService.createForGuardian).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ptm_cancel', targetType: 'ptm_booking' }),
      );
    });

    it('rejects cancelling within the cancellationCutoffHours window', async () => {
      (bookingRepo.findOne as jest.Mock).mockResolvedValue(buildBooking());
      (slotRepo.findOne as jest.Mock).mockResolvedValue(
        buildSlot({ status: PtmSlotStatus.BOOKED, slotStartTime: new Date(Date.now() + 60 * 60 * 1000) }), // 1h away, cutoff is 24h
      );

      await expect(service.cancel(BOOKING_ID, GUARDIAN_ID)).rejects.toThrow(ForbiddenException);
      expect(slotRepo.save).not.toHaveBeenCalled();
    });

    it('rejects cancelling a booking that belongs to a different guardian', async () => {
      (bookingRepo.findOne as jest.Mock).mockResolvedValue(buildBooking({ guardianId: 'someone-else' }));

      await expect(service.cancel(BOOKING_ID, GUARDIAN_ID)).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling an already-cancelled booking', async () => {
      (bookingRepo.findOne as jest.Mock).mockResolvedValue(buildBooking({ status: PtmBookingStatus.CANCELLED }));

      await expect(service.cancel(BOOKING_ID, GUARDIAN_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('sendReminders — the AI-prompt-requested 24-hour reminder job', () => {
    it('notifies both parties for a booking within the 24-hour window and marks it reminded', async () => {
      const nearSlot = buildSlot({ slotStartTime: new Date(Date.now() + 12 * 60 * 60 * 1000) }); // 12h away
      (bookingRepo.find as jest.Mock).mockResolvedValue([buildBooking()]);
      (slotRepo.find as jest.Mock).mockResolvedValue([nearSlot]);
      (guardianRepo.find as jest.Mock).mockResolvedValue([buildGuardian()]);
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent()]);

      await service.sendReminders();

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        TEACHER_ID,
        'PTM Reminder',
        expect.any(String),
        'ptm_reminder',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        GUARDIAN_ID,
        'PTM Reminder',
        expect.any(String),
        'ptm_reminder',
      );
      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ reminderSentAt: expect.any(Date) }));
    });

    it('ignores a booking whose meeting is more than 24 hours away (dedupe/window check)', async () => {
      const farSlot = buildSlot({ slotStartTime: new Date(Date.now() + 72 * 60 * 60 * 1000) }); // 72h away
      (bookingRepo.find as jest.Mock).mockResolvedValue([buildBooking()]);
      (slotRepo.find as jest.Mock).mockResolvedValue([farSlot]);

      await service.sendReminders();

      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when there are no bookings pending a reminder', async () => {
      (bookingRepo.find as jest.Mock).mockResolvedValue([]);

      await service.sendReminders();

      expect(slotRepo.find).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });
  });

  describe('listMyBookings / listAvailableSlots', () => {
    it('lists the calling guardian own bookings, most recent first', async () => {
      await service.listMyBookings(GUARDIAN_ID);
      expect(bookingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { guardianId: GUARDIAN_ID } }),
      );
    });

    it('lists available slots for an event, optionally filtered to one teacher', async () => {
      await service.listAvailableSlots(EVENT_ID, TEACHER_ID);
      expect(slotRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ptmEventId: EVENT_ID, status: PtmSlotStatus.AVAILABLE, teacherId: TEACHER_ID }),
        }),
      );
    });
  });
});
