import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LiveClassMonitorService } from './live-class-monitor.service';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassCheckInEntity } from '../class-check-in/entities/class-check-in.entity';
import { SchoolSettingsService } from '../school-settings/school-settings.service';

// 2026-01-05 09:00 is a Monday (day=1)
const MONDAY_9AM = new Date(2026, 0, 5, 9, 0);

function buildEntry(overrides: Partial<TimetableEntryEntity> = {}): TimetableEntryEntity {
  return {
    id: 1,
    academicYear: '2026',
    classSectionId: 27,
    day: 1,
    period: 3, // starts 08:50 given 07:30 start + 40min periods
    teacherId: 'teacher-1',
    subjectId: 'subject-1',
    roomNumber: 'Room 5',
    status: 'confirmed',
    generatedAt: new Date(),
    classSection: {
      id: 27,
      name: 'C',
      academicYear: '2026',
      grade: { id: 9, level: 9, name: 'Grade 9', stage: 'junior_secondary' },
      gradeId: 9,
      classTeacherStaffId: null,
    } as never,
    teacher: { firstName: 'Nimal', lastName: 'Perera' } as never,
    subject: { name: 'Mathematics' } as never,
    ...overrides,
  } as unknown as TimetableEntryEntity;
}

describe('LiveClassMonitorService', () => {
  let service: LiveClassMonitorService;
  let timetableRepo: { find: jest.Mock };
  let checkInRepo: { find: jest.Mock };
  let schoolSettingsService: { get: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    timetableRepo = { find: jest.fn().mockResolvedValue([]) };
    checkInRepo = { find: jest.fn().mockResolvedValue([]) };
    schoolSettingsService = { get: jest.fn().mockResolvedValue({ lateThresholdMinutes: 10 }) };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, unknown> = {
          'freePeriod.schoolStartTime': '07:30',
          'freePeriod.periodDurationMinutes': 40,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveClassMonitorService,
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableRepo },
        { provide: getRepositoryToken(ClassCheckInEntity), useValue: checkInRepo },
        { provide: SchoolSettingsService, useValue: schoolSettingsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LiveClassMonitorService>(LiveClassMonitorService);
    jest.useFakeTimers();
    jest.setSystemTime(MONDAY_9AM);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty array when no timetable entries exist for today', async () => {
    const result = await service.getTodayStatusGrid();
    expect(result).toEqual([]);
    expect(checkInRepo.find).not.toHaveBeenCalled();
  });

  it('queries timetable entries for the current weekday', async () => {
    await service.getTodayStatusGrid();
    expect(timetableRepo.find).toHaveBeenCalledWith({ where: { day: 1 } });
  });

  it('computes green status when a check-in exists for the entry today', async () => {
    const entry = buildEntry({ id: 40 });
    timetableRepo.find.mockResolvedValue([entry]);
    checkInRepo.find.mockResolvedValue([
      { timetableEntryId: 40, checkedInAt: new Date(2026, 0, 5, 8, 51) },
    ]);

    const result = await service.getTodayStatusGrid();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('green');
    expect(result[0].checkedInAt).not.toBeNull();
  });

  it('computes amber status when no check-in exists and the period started within the threshold', async () => {
    jest.setSystemTime(new Date(2026, 0, 5, 8, 55)); // period 3 starts 08:50 -> 5 min elapsed
    const entry = buildEntry({ id: 41, period: 3 });
    timetableRepo.find.mockResolvedValue([entry]);

    const result = await service.getTodayStatusGrid();

    expect(result[0].status).toBe('amber');
  });

  it('computes grey status for a period that has not started yet', async () => {
    const entry = buildEntry({ id: 43, period: 4 }); // starts 09:30; now is 09:00
    timetableRepo.find.mockResolvedValue([entry]);

    const result = await service.getTodayStatusGrid();

    expect(result[0].status).toBe('grey');
  });

  it('computes red status when no check-in exists and the threshold has passed', async () => {
    const entry = buildEntry({ id: 42, period: 3 }); // starts 08:50; now 09:00 -> 10 min elapsed
    timetableRepo.find.mockResolvedValue([entry]);

    const result = await service.getTodayStatusGrid();

    expect(result[0].status).toBe('red');
  });

  it('reflects a changed lateThresholdMinutes value on the very next call, with no caching or restart', async () => {
    // period 3 starts 08:50; "now" fixed at MONDAY_9AM (09:00) -> 10 min elapsed, held constant.
    const entry = buildEntry({ id: 44, period: 3 });
    timetableRepo.find.mockResolvedValue([entry]);

    schoolSettingsService.get.mockResolvedValue({ lateThresholdMinutes: 15 });
    const first = await service.getTodayStatusGrid();
    expect(first[0].status).toBe('amber'); // 10 min elapsed < 15 min threshold

    schoolSettingsService.get.mockResolvedValue({ lateThresholdMinutes: 5 });
    const second = await service.getTodayStatusGrid();
    expect(second[0].status).toBe('red'); // same elapsed time, new 5 min threshold

    expect(schoolSettingsService.get).toHaveBeenCalledTimes(2); // fresh DB read every call, no caching
  });

  it('filters out entries outside the given grade range', async () => {
    const inRange = buildEntry({ id: 1, classSectionId: 27 });
    const outOfRange = buildEntry({
      id: 2,
      classSectionId: 1,
      classSection: {
        id: 1,
        name: 'A',
        academicYear: '2026',
        grade: { id: 1, level: 1, name: 'Grade 1', stage: 'primary' },
        gradeId: 1,
        classTeacherStaffId: null,
      } as never,
    });
    timetableRepo.find.mockResolvedValue([inRange, outOfRange]);

    const result = await service.getTodayStatusGrid(6, 11);

    expect(result).toHaveLength(1);
    expect(result[0].timetableEntryId).toBe(1);
  });

  it('includes teacher name, class, subject, and room in each row', async () => {
    timetableRepo.find.mockResolvedValue([buildEntry({ id: 40 })]);

    const result = await service.getTodayStatusGrid();

    expect(result[0]).toEqual(
      expect.objectContaining({
        teacherName: 'Nimal Perera',
        classSectionName: 'C',
        gradeLevel: 9,
        subjectName: 'Mathematics',
        roomNumber: 'Room 5',
      }),
    );
  });

  it('sorts results by period, then class section name', async () => {
    const gradeNine = { id: 9, level: 9, name: 'Grade 9', stage: 'junior_secondary' };
    const periodOne = buildEntry({
      id: 1,
      period: 1,
      classSection: { id: 27, name: 'Z', academicYear: '2026', grade: gradeNine, gradeId: 9, classTeacherStaffId: null } as never,
    });
    const periodTwo = buildEntry({
      id: 2,
      period: 2,
      classSection: { id: 28, name: 'A', academicYear: '2026', grade: gradeNine, gradeId: 9, classTeacherStaffId: null } as never,
    });
    timetableRepo.find.mockResolvedValue([periodTwo, periodOne]);

    const result = await service.getTodayStatusGrid();

    expect(result.map((r) => r.timetableEntryId)).toEqual([1, 2]);
  });
});
