import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LabBookingService } from './lab-booking.service';
import { LabBookingEntity } from './entities/lab-booking.entity';
import { LabEntity } from './entities/lab.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-booking-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const LAB_ID = 'lab-uuid';
const STAFF_ID = 'staff-uuid';
const LAB_IN_CHARGE_ID = 'lab-in-charge-uuid';
const CLASS_SECTION_ID = 101;
const SUBJECT_ID = 'subject-uuid';

const activeLab = { id: LAB_ID, name: 'Chemistry Lab 1', isUnderMaintenance: false, labInChargeId: LAB_IN_CHARGE_ID };

describe('LabBookingService', () => {
  let service: LabBookingService;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let labRepo: MockRepo<LabEntity>;
  let timetableEntryRepo: MockRepo<TimetableEntryEntity>;
  let classSectionRepo: MockRepo<ClassSectionEntity>;
  let subjectRepo: MockRepo<SubjectEntity>;
  let termRepo: MockRepo<AcademicTermEntity>;
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    bookingRepo = repoMock<LabBookingEntity>();
    labRepo = repoMock<LabEntity>();
    timetableEntryRepo = repoMock<TimetableEntryEntity>();
    classSectionRepo = repoMock<ClassSectionEntity>();
    subjectRepo = repoMock<SubjectEntity>();
    termRepo = repoMock<AcademicTermEntity>();
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabBookingService,
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableEntryRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(AcademicTermEntity), useValue: termRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<LabBookingService>(LabBookingService);
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('creates an ad-hoc booking (no timetableEntryId) when class/subject resolve and the slot is free', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      classSectionRepo.findOne!.mockResolvedValue({ id: CLASS_SECTION_ID });
      subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID });
      bookingRepo.findOne!.mockResolvedValue(undefined);

      const result = await service.createBooking(
        LAB_ID,
        { date: '2026-08-15', periodNumber: 3, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID, purpose: 'Titration practical' },
        STAFF_ID,
        false,
      );

      expect(bookingRepo.save).toHaveBeenCalledTimes(1);
      expect(bookingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labId: LAB_ID,
          date: '2026-08-15',
          periodNumber: 3,
          classSectionId: CLASS_SECTION_ID,
          subjectId: SUBJECT_ID,
          teacherId: STAFF_ID,
          status: 'confirmed',
          timetableEntryId: null,
        }),
      );
      expect(result).toBeDefined();
    });

    it('derives classSectionId/subjectId from a linked timetable entry belonging to the caller', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      // 2026-08-17 is a Monday (day=1).
      timetableEntryRepo.findOne!.mockResolvedValue({
        id: 55,
        teacherId: STAFF_ID,
        day: 1,
        classSectionId: CLASS_SECTION_ID,
        subjectId: SUBJECT_ID,
      });
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await service.createBooking(
        LAB_ID,
        { date: '2026-08-17', periodNumber: 2, timetableEntryId: 55 },
        STAFF_ID,
        false,
      );

      expect(bookingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID, timetableEntryId: 55 }),
      );
    });

    it('throws ConflictException and never saves when the lab is under maintenance', async () => {
      labRepo.findOne!.mockResolvedValue({ ...activeLab, isUnderMaintenance: true });

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-15', periodNumber: 3, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID }, STAFF_ID, false),
      ).rejects.toThrow(ConflictException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown lab', async () => {
      labRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.createBooking('missing-id', { date: '2026-08-15', periodNumber: 3, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID }, STAFF_ID, false),
      ).rejects.toThrow(NotFoundException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('the explicitly-requested test: throws ConflictException (409) when a confirmed booking already exists for the same lab+date+periodNumber, and never saves', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      classSectionRepo.findOne!.mockResolvedValue({ id: CLASS_SECTION_ID });
      subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID });
      bookingRepo.findOne!.mockResolvedValue({ id: 'existing-booking', status: 'confirmed' });

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-15', periodNumber: 3, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID }, STAFF_ID, false),
      ).rejects.toThrow(ConflictException);
      expect(bookingRepo.findOne).toHaveBeenCalledWith({
        where: { labId: LAB_ID, date: '2026-08-15', periodNumber: 3, status: 'confirmed' },
      });
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });

    it('sends a notification to the lab In-Charge on a successful booking', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      classSectionRepo.findOne!.mockResolvedValue({ id: CLASS_SECTION_ID });
      subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID });
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await service.createBooking(
        LAB_ID,
        { date: '2026-08-15', periodNumber: 3, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID },
        STAFF_ID,
        false,
      );

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        LAB_IN_CHARGE_ID,
        expect.any(String),
        expect.any(String),
        'lab_booking_confirmed',
      );
    });

    it('throws 422 when neither timetableEntryId nor classSectionId+subjectId are given', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-15', periodNumber: 3 }, STAFF_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ForbiddenException when a non-privileged caller links a timetable entry that is not theirs', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      timetableEntryRepo.findOne!.mockResolvedValue({ id: 55, teacherId: 'someone-else', day: 1, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID });

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-17', periodNumber: 2, timetableEntryId: 55 }, STAFF_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to link a timetable entry belonging to a different teacher', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      timetableEntryRepo.findOne!.mockResolvedValue({ id: 55, teacherId: 'someone-else', day: 1, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID });
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-17', periodNumber: 2, timetableEntryId: 55 }, STAFF_ID, true),
      ).resolves.toBeDefined();
    });

    it('throws 422 when the requested date does not fall on the linked timetable entry\'s day', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      // 2026-08-18 is a Tuesday (day=2), entry expects Monday (day=1).
      timetableEntryRepo.findOne!.mockResolvedValue({ id: 55, teacherId: STAFF_ID, day: 1, classSectionId: CLASS_SECTION_ID, subjectId: SUBJECT_ID });

      await expect(
        service.createBooking(LAB_ID, { date: '2026-08-18', periodNumber: 2, timetableEntryId: 55 }, STAFF_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('cancelBooking', () => {
    const confirmedBooking = {
      id: 'booking-1',
      labId: LAB_ID,
      date: '2026-08-15',
      periodNumber: 3,
      status: 'confirmed',
      teacherId: STAFF_ID,
    };

    it('the explicitly-requested test: cancels the booking and notifies the Lab In-Charge', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);

      const result = await service.cancelBooking(LAB_ID, 'booking-1', STAFF_ID, false);

      expect(result.status).toBe('cancelled');
      expect(result.cancelledByStaffId).toBe(STAFF_ID);
      expect(result.cancelledAt).toBeInstanceOf(Date);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        LAB_IN_CHARGE_ID,
        expect.any(String),
        expect.any(String),
        'lab_booking_cancelled',
      );
    });

    it('throws NotFoundException for an unknown booking', async () => {
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.cancelBooking(LAB_ID, 'missing', STAFF_ID, false)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the booking is already cancelled', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, status: 'cancelled' });

      await expect(service.cancelBooking(LAB_ID, 'booking-1', STAFF_ID, false)).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException when a non-privileged, non-owning caller tries to cancel', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });

      await expect(service.cancelBooking(LAB_ID, 'booking-1', STAFF_ID, false)).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to cancel a booking they do not own', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });
      labRepo.findOne!.mockResolvedValue(activeLab);

      await expect(service.cancelBooking(LAB_ID, 'booking-1', STAFF_ID, true)).resolves.toBeDefined();
    });
  });

  describe('createRecurringBooking', () => {
    const recurringDto = {
      classSectionId: CLASS_SECTION_ID,
      subjectId: SUBJECT_ID,
      dayOfWeek: 2, // Tuesday
      periodNumber: 4,
      termId: 1,
    };
    // 2026-09-01, 08, 15, 22 are all Tuesdays — 4 matching dates.
    const term = { id: 1, startDate: '2026-09-01', endDate: '2026-09-22' };

    it('the explicitly-requested test: creates exactly one booking per matching weekday/period across the term, with no conflicts', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      termRepo.findOne!.mockResolvedValue(term);
      classSectionRepo.findOne!.mockResolvedValue({ id: CLASS_SECTION_ID });
      subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID });
      bookingRepo.findOne!.mockResolvedValue(undefined);

      const result = await service.createRecurringBooking(LAB_ID, recurringDto, STAFF_ID, false);

      expect(bookingRepo.save).toHaveBeenCalledTimes(4);
      expect(result.created).toHaveLength(4);
      expect(result.skipped).toHaveLength(0);
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        LAB_IN_CHARGE_ID,
        expect.any(String),
        expect.stringContaining('4'),
        'lab_booking_recurring_confirmed',
      );
    });

    it('skips a conflicting date instead of aborting the whole batch', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      termRepo.findOne!.mockResolvedValue(term);
      classSectionRepo.findOne!.mockResolvedValue({ id: CLASS_SECTION_ID });
      subjectRepo.findOne!.mockResolvedValue({ id: SUBJECT_ID });
      bookingRepo.findOne!.mockImplementation(({ where }: { where: { date: string } }) =>
        Promise.resolve(where.date === '2026-09-15' ? { id: 'existing' } : undefined),
      );

      const result = await service.createRecurringBooking(LAB_ID, recurringDto, STAFF_ID, false);

      expect(result.created).toHaveLength(3);
      expect(result.skipped).toEqual([{ date: '2026-09-15', reason: expect.any(String) }]);
      expect(bookingRepo.save).toHaveBeenCalledTimes(3);
    });

    it('throws ConflictException when the lab is under maintenance', async () => {
      labRepo.findOne!.mockResolvedValue({ ...activeLab, isUnderMaintenance: true });

      await expect(service.createRecurringBooking(LAB_ID, recurringDto, STAFF_ID, false)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException for an unknown term', async () => {
      labRepo.findOne!.mockResolvedValue(activeLab);
      termRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.createRecurringBooking(LAB_ID, recurringDto, STAFF_ID, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLab', () => {
    it('returns the bookings for a lab, most recent date first, when no weekStart is given', async () => {
      bookingRepo.find!.mockResolvedValue([{ id: 'b1' }, { id: 'b2' }]);

      const result = await service.findByLab(LAB_ID);

      expect(bookingRepo.find).toHaveBeenCalledWith({
        where: { labId: LAB_ID },
        order: { date: 'DESC', periodNumber: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('filters to a single Monday-anchored week when weekStart is given', async () => {
      bookingRepo.find!.mockResolvedValue([{ id: 'b1' }]);

      await service.findByLab(LAB_ID, '2026-08-17');

      expect(bookingRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ labId: LAB_ID }),
          order: { date: 'ASC', periodNumber: 'ASC' },
        }),
      );
    });
  });
});
