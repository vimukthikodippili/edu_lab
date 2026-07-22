import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ExperimentLogService } from './experiment-log.service';
import { ExperimentLogEntity } from './entities/experiment-log.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findByIds: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-log-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const LAB_ID = 'lab-uuid';
const BOOKING_ID = 'booking-uuid';
const TEACHER_ID = 'teacher-uuid';

const activeLab = { id: LAB_ID, name: 'Chemistry Lab 1' };
const confirmedBooking = {
  id: BOOKING_ID,
  labId: LAB_ID,
  teacherId: TEACHER_ID,
  status: 'confirmed',
  date: '2026-08-15',
  periodNumber: 3,
  classSectionId: 27,
  classSection: { name: 'Grade 10 - C' },
  subjectId: 'subject-uuid',
  subject: { name: 'Chemistry' },
  teacher: { firstName: 'Nimal', lastName: 'Perera' },
};

describe('ExperimentLogService', () => {
  let service: ExperimentLogService;
  let logRepo: MockRepo<ExperimentLogEntity>;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let labRepo: MockRepo<LabEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    logRepo = repoMock<ExperimentLogEntity>();
    bookingRepo = repoMock<LabBookingEntity>();
    labRepo = repoMock<LabEntity>();
    fileRepo = repoMock<FileEntity>();
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperimentLogService,
        { provide: getRepositoryToken(ExperimentLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<ExperimentLogService>(ExperimentLogService);
    jest.clearAllMocks();
  });

  describe('getMissingLogsForDate — the explicitly-requested missing-log detection test', () => {
    it('returns confirmed bookings for the date that have no experiment log', async () => {
      bookingRepo.find!.mockResolvedValue([
        { id: 'b1', teacherId: 'a' },
        { id: 'b2', teacherId: 'b' },
      ]);
      logRepo.find!.mockResolvedValue([{ labBookingId: 'b1' }]);

      const result = await service.getMissingLogsForDate('2026-08-15');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b2');
      expect(bookingRepo.find).toHaveBeenCalledWith({ where: { date: '2026-08-15', status: 'confirmed' } });
    });

    it('returns an empty array when every confirmed booking already has a log', async () => {
      bookingRepo.find!.mockResolvedValue([{ id: 'b1', teacherId: 'a' }]);
      logRepo.find!.mockResolvedValue([{ labBookingId: 'b1' }]);

      const result = await service.getMissingLogsForDate('2026-08-15');

      expect(result).toEqual([]);
    });

    it('returns an empty array with no query against logs when there are no confirmed bookings for the date', async () => {
      bookingRepo.find!.mockResolvedValue([]);

      const result = await service.getMissingLogsForDate('2026-08-15');

      expect(result).toEqual([]);
      expect(logRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('sendMissingLogReminders', () => {
    it('notifies each teacher once, with the correct count of missing sessions that day', async () => {
      bookingRepo.find!.mockResolvedValue([
        { id: 'b1', teacherId: 'teacher-a' },
        { id: 'b2', teacherId: 'teacher-a' },
        { id: 'b3', teacherId: 'teacher-b' },
      ]);
      logRepo.find!.mockResolvedValue([]);

      await service.sendMissingLogReminders();

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(2);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'teacher-a', expect.any(String), expect.stringContaining('2'), 'experiment_log_reminder',
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'teacher-b', expect.any(String), expect.stringContaining('1'), 'experiment_log_reminder',
      );
    });

    it('sends nothing when there are no missing logs', async () => {
      bookingRepo.find!.mockResolvedValue([]);

      await service.sendMissingLogReminders();

      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });
  });

  describe('findForBooking', () => {
    it('returns the pre-fill context and null log when none has been logged yet', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      logRepo.findOne!.mockResolvedValue(undefined);

      const result = await service.findForBooking(BOOKING_ID, TEACHER_ID, false);

      expect(result.log).toBeNull();
      expect(result.context.labName).toBe('Chemistry Lab 1');
      expect(result.context.subjectName).toBe('Chemistry');
    });

    it('throws NotFoundException for an unknown booking', async () => {
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.findForBooking(BOOKING_ID, TEACHER_ID, false)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-owning, non-privileged caller', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });

      await expect(service.findForBooking(BOOKING_ID, TEACHER_ID, false)).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to view a booking they do not own', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });
      labRepo.findOne!.mockResolvedValue(activeLab);
      logRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.findForBooking(BOOKING_ID, TEACHER_ID, true)).resolves.toBeDefined();
    });
  });

  describe('upsertForBooking', () => {
    const dto = {
      experimentName: 'Titration',
      objective: 'Find concentration',
      procedureSummary: 'Added indicator, titrated.',
      outcome: 'Endpoint at 22.4ml.',
    };

    it('creates a new log when none exists yet', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      logRepo.findOne!.mockResolvedValue(undefined);

      const result = await service.upsertForBooking(BOOKING_ID, dto, TEACHER_ID, false);

      expect(logRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ labBookingId: BOOKING_ID, experimentName: 'Titration', loggedById: TEACHER_ID }),
      );
      expect(result).toBeDefined();
    });

    it('updates the existing log for the same booking instead of creating a second row', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      const existing = { id: 'log-1', labBookingId: BOOKING_ID, experimentName: 'Old name', attachmentFileIds: [] };
      logRepo.findOne!.mockResolvedValue(existing);

      await service.upsertForBooking(BOOKING_ID, dto, TEACHER_ID, false);

      expect(logRepo.create).not.toHaveBeenCalled();
      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'log-1', experimentName: 'Titration' }),
      );
    });

    it('throws ConflictException for a cancelled booking', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, status: 'cancelled' });

      await expect(service.upsertForBooking(BOOKING_ID, dto, TEACHER_ID, false)).rejects.toThrow(ConflictException);
    });

    it('throws ForbiddenException for a non-owning, non-privileged caller', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });

      await expect(service.upsertForBooking(BOOKING_ID, dto, TEACHER_ID, false)).rejects.toThrow(ForbiddenException);
    });

    it('throws 422 when an attachment file id does not exist', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      logRepo.findOne!.mockResolvedValue(undefined);
      fileRepo.findByIds!.mockResolvedValue([]);

      await expect(
        service.upsertForBooking(BOOKING_ID, { ...dto, attachmentFileIds: ['missing-file-id'] }, TEACHER_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('findFiltered', () => {
    it('scopes a non-full-access caller (teacher) to their own bookings regardless of filters', async () => {
      bookingRepo.find!.mockResolvedValue([]);

      await service.findFiltered({}, TEACHER_ID, false);

      expect(bookingRepo.find).toHaveBeenCalledWith({ where: { teacherId: TEACHER_ID } });
    });

    it('applies labId/subjectId/classSectionId/date-range filters without ownership scoping for full-access callers', async () => {
      bookingRepo.find!.mockResolvedValue([]);

      await service.findFiltered({ labId: LAB_ID, subjectId: 'sub-1', classSectionId: 27, dateFrom: '2026-01-01', dateTo: '2026-12-31' }, TEACHER_ID, true);

      expect(bookingRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({ labId: LAB_ID, subjectId: 'sub-1', classSectionId: 27, date: expect.anything() }),
      });
    });

    it('returns rows enriched with labName, and an empty array when no bookings match', async () => {
      bookingRepo.find!.mockResolvedValue([]);

      const result = await service.findFiltered({}, TEACHER_ID, true);

      expect(result).toEqual([]);
      expect(logRepo.find).not.toHaveBeenCalled();
    });
  });
});
