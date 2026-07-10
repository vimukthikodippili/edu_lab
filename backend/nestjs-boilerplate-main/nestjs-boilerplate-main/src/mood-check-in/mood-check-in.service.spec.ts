import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoodCheckInService } from './mood-check-in.service';
import { MoodCheckInEntity } from './entities/mood-check-in.entity';

const STUDENT_ID = 'student-uuid';
// 2026-06-29 = Monday
const MONDAY = new Date(2026, 5, 29, 9, 0);

describe('MoodCheckInService', () => {
  let service: MoodCheckInService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'mood-1', ...d })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodCheckInService,
        { provide: getRepositoryToken(MoodCheckInEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<MoodCheckInService>(MoodCheckInService);
    jest.useFakeTimers();
    jest.setSystemTime(MONDAY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getTodayStatus', () => {
    it('returns null (never throws) when no check-in exists for today — an optional feature must never block on absent data', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.getTodayStatus(STUDENT_ID);

      expect(result).toBeNull();
    });

    it('returns the existing row when one exists for today', async () => {
      const existing = { id: 'mood-1', studentId: STUDENT_ID, date: '2026-06-29', moodValue: 4 };
      repo.findOne.mockResolvedValue(existing);

      const result = await service.getTodayStatus(STUDENT_ID);

      expect(result).toBe(existing);
    });
  });

  describe('submit', () => {
    it('creates a new row when none exists for today', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.submit(STUDENT_ID, 5);

      expect(repo.create).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        date: '2026-06-29',
        moodValue: 5,
      });
      expect(result.moodValue).toBe(5);
    });

    it('updates (upserts) the existing row instead of creating a duplicate on a second same-day submission', async () => {
      const existing = { id: 'mood-1', studentId: STUDENT_ID, date: '2026-06-29', moodValue: 2 };
      repo.findOne.mockResolvedValue(existing);

      const result = await service.submit(STUDENT_ID, 5);

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'mood-1', moodValue: 5 }));
      expect(result.moodValue).toBe(5);
    });
  });
});
