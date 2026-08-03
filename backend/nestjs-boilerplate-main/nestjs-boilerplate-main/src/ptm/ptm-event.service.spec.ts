import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { PTMEventService } from './ptm-event.service';
import { PTMEventEntity, PtmEventStatus } from './entities/ptm-event.entity';
import { PTMTeacherAvailabilityEntity } from './entities/ptm-teacher-availability.entity';
import { PTMSlotEntity, PtmSlotStatus } from './entities/ptm-slot.entity';
import { PTMBookingEntity, PtmBookingStatus } from './entities/ptm-booking.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'generated', ...(d as object) })),
  create: jest.fn((d: unknown) => d),
});

const EVENT_ID = 'event-1';
const TEACHER_ID = 'teacher-1';

function buildEvent(overrides: Partial<PTMEventEntity> = {}): PTMEventEntity {
  return {
    id: EVENT_ID,
    name: 'Term 2 PTM',
    date: '2026-09-15',
    slotDurationMinutes: 10,
    cancellationCutoffHours: 24,
    status: PtmEventStatus.DRAFT,
    createdByStaffId: 'staff-1',
    ...overrides,
  } as PTMEventEntity;
}

function buildAvailability(overrides: Partial<PTMTeacherAvailabilityEntity> = {}): PTMTeacherAvailabilityEntity {
  return {
    id: 'avail-1',
    ptmEventId: EVENT_ID,
    teacherId: TEACHER_ID,
    startTime: '13:00',
    endTime: '13:25',
    ...overrides,
  } as PTMTeacherAvailabilityEntity;
}

describe('PTMEventService', () => {
  let service: PTMEventService;
  let eventRepo: MockRepo<PTMEventEntity>;
  let availabilityRepo: MockRepo<PTMTeacherAvailabilityEntity>;
  let slotRepo: MockRepo<PTMSlotEntity>;
  let bookingRepo: MockRepo<PTMBookingEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let studentRepo: MockRepo<StudentEntity>;

  beforeEach(async () => {
    eventRepo = repoMock<PTMEventEntity>();
    availabilityRepo = repoMock<PTMTeacherAvailabilityEntity>();
    slotRepo = repoMock<PTMSlotEntity>();
    bookingRepo = repoMock<PTMBookingEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    studentRepo = repoMock<StudentEntity>();

    (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PTMEventService,
        { provide: getRepositoryToken(PTMEventEntity), useValue: eventRepo },
        { provide: getRepositoryToken(PTMTeacherAvailabilityEntity), useValue: availabilityRepo },
        { provide: getRepositoryToken(PTMSlotEntity), useValue: slotRepo },
        { provide: getRepositoryToken(PTMBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    service = module.get(PTMEventService);
  });

  describe('create', () => {
    it('creates a draft event with a default cancellationCutoffHours when none is given', async () => {
      await service.create({ name: 'Term 2 PTM', date: '2026-09-15', slotDurationMinutes: 10 }, 'staff-1');
      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ cancellationCutoffHours: 24, createdByStaffId: 'staff-1' }),
      );
    });
  });

  describe('submitAvailability', () => {
    it('creates a new availability window when none exists yet', async () => {
      (availabilityRepo.findOne as jest.Mock).mockResolvedValue(null);
      await service.submitAvailability(EVENT_ID, TEACHER_ID, { startTime: '13:00', endTime: '16:00' });
      expect(availabilityRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ptmEventId: EVENT_ID, teacherId: TEACHER_ID, startTime: '13:00', endTime: '16:00' }),
      );
    });

    it('updates the existing window instead of creating a duplicate', async () => {
      (availabilityRepo.findOne as jest.Mock).mockResolvedValue(buildAvailability());
      await service.submitAvailability(EVENT_ID, TEACHER_ID, { startTime: '14:00', endTime: '17:00' });
      expect(availabilityRepo.create).not.toHaveBeenCalled();
      expect(availabilityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: '14:00', endTime: '17:00' }),
      );
    });

    it('rejects submitting availability once the event is already published', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: PtmEventStatus.PUBLISHED }));
      await expect(
        service.submitAvailability(EVENT_ID, TEACHER_ID, { startTime: '13:00', endTime: '16:00' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('publish — slot generation', () => {
    it('slices a window evenly, discarding a remainder that does not fill a full slot', async () => {
      // 13:00-13:25 sliced by 10-minute slots -> 13:00-13:10, 13:10-13:20, and a 5-minute remainder discarded.
      (availabilityRepo.find as jest.Mock).mockResolvedValue([buildAvailability()]);

      const result = await service.publish(EVENT_ID);

      expect(result.slotsGenerated).toBe(2);
      expect(slotRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          slotStartTime: new Date('2026-09-15T13:00:00.000Z'),
          slotEndTime: new Date('2026-09-15T13:10:00.000Z'),
        }),
        expect.objectContaining({
          slotStartTime: new Date('2026-09-15T13:10:00.000Z'),
          slotEndTime: new Date('2026-09-15T13:20:00.000Z'),
        }),
      ]);
      expect(eventRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: PtmEventStatus.PUBLISHED }));
    });

    it('generates slots for every teacher who submitted availability, independently', async () => {
      (availabilityRepo.find as jest.Mock).mockResolvedValue([
        buildAvailability({ teacherId: 'teacher-a', startTime: '09:00', endTime: '09:20' }),
        buildAvailability({ teacherId: 'teacher-b', startTime: '10:00', endTime: '10:10' }),
      ]);

      const result = await service.publish(EVENT_ID);

      expect(result.slotsGenerated).toBe(3); // 2 for teacher-a + 1 for teacher-b
    });

    it('is one-shot — rejects publishing an already-published event', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(buildEvent({ status: PtmEventStatus.PUBLISHED }));
      await expect(service.publish(EVENT_ID)).rejects.toThrow(ConflictException);
      expect(slotRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown event', async () => {
      (eventRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.publish('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll — visibility filtering', () => {
    it('restricts a guardian caller to published events only', async () => {
      await service.findAll(true);
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: PtmEventStatus.PUBLISHED } }),
      );
    });

    it('returns every status for a staff caller', async () => {
      await service.findAll(false);
      expect(eventRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('getTeacherSchedule', () => {
    it('joins guardian and student names onto booked slots, leaves open slots unjoined', async () => {
      const bookedSlot = { id: 'slot-a', status: PtmSlotStatus.BOOKED } as PTMSlotEntity;
      const openSlot = { id: 'slot-b', status: PtmSlotStatus.AVAILABLE } as PTMSlotEntity;
      (slotRepo.find as jest.Mock).mockResolvedValue([bookedSlot, openSlot]);
      (bookingRepo.find as jest.Mock).mockResolvedValue([
        { ptmSlotId: 'slot-a', guardianId: 'guardian-1', studentId: 'student-1', status: PtmBookingStatus.CONFIRMED },
      ]);
      (guardianRepo.find as jest.Mock).mockResolvedValue([{ id: 'guardian-1', firstName: 'Kamal', lastName: 'Silva' }]);
      (studentRepo.find as jest.Mock).mockResolvedValue([{ id: 'student-1', firstName: 'Nadeesha', lastName: 'Silva' }]);

      const rows = await service.getTeacherSchedule(EVENT_ID, TEACHER_ID);

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual(expect.objectContaining({ guardianName: 'Kamal Silva', studentName: 'Nadeesha Silva' }));
      expect(rows[1]).toEqual(expect.objectContaining({ guardianName: null, studentName: null }));
    });

    it('returns an empty array when the teacher has no slots for this event', async () => {
      (slotRepo.find as jest.Mock).mockResolvedValue([]);
      const rows = await service.getTeacherSchedule(EVENT_ID, TEACHER_ID);
      expect(rows).toEqual([]);
      expect(bookingRepo.find).not.toHaveBeenCalled();
    });
  });
});
