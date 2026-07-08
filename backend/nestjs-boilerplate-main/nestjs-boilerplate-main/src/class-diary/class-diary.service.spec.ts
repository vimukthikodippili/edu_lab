import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClassDiaryService } from './class-diary.service';
import { ClassDiaryEntryEntity } from './entities/class-diary-entry.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { SchoolHolidayEntity } from '../attendance/entities/school-holiday.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { NotificationService } from '../notification/notification.service';

// 2023-01-02 is a Monday (day=1); 2023-01-01 is a Sunday (day=0)
const MONDAY = '2023-01-02';
const SUNDAY = '2023-01-01';

const makeTimetableEntry = (
  overrides: Partial<TimetableEntryEntity> = {},
): TimetableEntryEntity =>
  ({
    id: 1,
    academicYear: '2023',
    classSectionId: 1,
    day: 1,
    period: 1,
    teacherId: 'staff-uuid',
    subjectId: 'subject-uuid',
    roomNumber: null,
    generatedAt: new Date(),
    ...overrides,
  }) as TimetableEntryEntity;

describe('ClassDiaryService', () => {
  let service: ClassDiaryService;

  let diaryRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let timetableRepo: { find: jest.Mock; findOne: jest.Mock };
  let holidayRepo: { findOne: jest.Mock };
  let fileRepo: { findByIds: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };

  const staffId = 'staff-uuid';

  beforeEach(async () => {
    diaryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => ({ id: 'saved-uuid', ...entity })),
    };
    timetableRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
    holidayRepo = { findOne: jest.fn().mockResolvedValue(null) };
    fileRepo = { findByIds: jest.fn().mockResolvedValue([]) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassDiaryService,
        { provide: getRepositoryToken(ClassDiaryEntryEntity), useValue: diaryRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableRepo },
        { provide: getRepositoryToken(SchoolHolidayEntity), useValue: holidayRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<ClassDiaryService>(ClassDiaryService);
  });

  describe('getMissingEntriesForDate', () => {
    it('returns timetable entries with no matching diary entry for that date', async () => {
      timetableRepo.find.mockResolvedValue([
        makeTimetableEntry({ id: 1 }),
        makeTimetableEntry({ id: 2 }),
      ]);
      diaryRepo.find.mockResolvedValue([]); // no diary entries logged at all

      const result = await service.getMissingEntriesForDate(MONDAY);

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual([1, 2]);
    });

    it('excludes entries that already have a diary entry for that date', async () => {
      timetableRepo.find.mockResolvedValue([
        makeTimetableEntry({ id: 1 }),
        makeTimetableEntry({ id: 2 }),
      ]);
      diaryRepo.find.mockResolvedValue([
        { timetableEntryId: 1, date: MONDAY } as ClassDiaryEntryEntity,
      ]);

      const result = await service.getMissingEntriesForDate(MONDAY);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('returns [] for a Sunday', async () => {
      timetableRepo.find.mockResolvedValue([makeTimetableEntry({ id: 1 })]);

      const result = await service.getMissingEntriesForDate(SUNDAY);

      expect(result).toEqual([]);
      expect(timetableRepo.find).not.toHaveBeenCalled();
    });

    it('returns [] for a date registered in SchoolHolidayEntity', async () => {
      holidayRepo.findOne.mockResolvedValue({ id: 1, date: MONDAY, description: 'Poya Day' });
      timetableRepo.find.mockResolvedValue([makeTimetableEntry({ id: 1 })]);

      const result = await service.getMissingEntriesForDate(MONDAY);

      expect(result).toEqual([]);
      expect(timetableRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('upsertEntry', () => {
    const dto = { timetableEntryId: 1, date: MONDAY, notes: 'Taught fractions.' };

    it('creates a new entry when none exists', async () => {
      timetableRepo.findOne.mockResolvedValue(makeTimetableEntry({ id: 1, teacherId: staffId }));
      diaryRepo.findOne.mockResolvedValue(null);

      await service.upsertEntry(staffId, dto);

      expect(diaryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ timetableEntryId: 1, date: MONDAY, notes: 'Taught fractions.' }),
      );
      expect(diaryRepo.save).toHaveBeenCalled();
    });

    it('updates notes when an entry already exists', async () => {
      timetableRepo.findOne.mockResolvedValue(makeTimetableEntry({ id: 1, teacherId: staffId }));
      diaryRepo.findOne.mockResolvedValue({
        id: 'entry-1', timetableEntryId: 1, date: MONDAY, notes: 'old', attachmentFileIds: [],
      });

      await service.upsertEntry(staffId, { ...dto, notes: 'updated notes' });

      expect(diaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'updated notes' }),
      );
      expect(diaryRepo.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when staffId does not own the timetable entry', async () => {
      timetableRepo.findOne.mockResolvedValue(
        makeTimetableEntry({ id: 1, teacherId: 'someone-else' }),
      );

      await expect(service.upsertEntry(staffId, dto)).rejects.toThrow(ForbiddenException);
    });

    it("throws UnprocessableEntityException when date's weekday doesn't match the entry's day", async () => {
      timetableRepo.findOne.mockResolvedValue(
        makeTimetableEntry({ id: 1, teacherId: staffId, day: 2 }), // Tuesday, but dto.date is Monday
      );

      await expect(service.upsertEntry(staffId, dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
});
