import { Test, TestingModule } from '@nestjs/testing';
import { StudentSportsService } from './student-sports.service';
import { SportsService } from './sports.service';
import { PerformanceService } from './performance.service';
import { SnapshotService } from './snapshot.service';
import { TrendFlag } from './entities/sport-student-snapshot.entity';

const STUDENT_ID = 'student-a';
const SPORT_TYPE_ATHLETICS_TRACK = { id: 'st-athletics-track', name: 'Athletics — Track', isPersonalBestEligible: true };
const SPORT_TYPE_CHESS = { id: 'st-chess', name: 'Chess', isPersonalBestEligible: false };

describe('StudentSportsService', () => {
  let service: StudentSportsService;
  let sportsService: { findEnrolledSports: jest.Mock };
  let performanceService: { findMatchHistoryForStudent: jest.Mock };
  let snapshotService: { findLatestSnapshotsForStudent: jest.Mock };

  beforeEach(async () => {
    sportsService = { findEnrolledSports: jest.fn() };
    performanceService = { findMatchHistoryForStudent: jest.fn() };
    snapshotService = { findLatestSnapshotsForStudent: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentSportsService,
        { provide: SportsService, useValue: sportsService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: SnapshotService, useValue: snapshotService },
      ],
    }).compile();

    service = module.get<StudentSportsService>(StudentSportsService);
  });

  it('returns an empty array when the student is enrolled in no sports', async () => {
    sportsService.findEnrolledSports.mockResolvedValue([]);

    const result = await service.getMyProfile(STUDENT_ID);

    expect(result).toEqual([]);
    expect(performanceService.findMatchHistoryForStudent).not.toHaveBeenCalled();
    expect(snapshotService.findLatestSnapshotsForStudent).not.toHaveBeenCalled();
  });

  it('composes match history and metric snapshots per enrolled sport', async () => {
    sportsService.findEnrolledSports.mockResolvedValue([
      {
        id: 'sport-1',
        name: 'Athletics',
        sportType: SPORT_TYPE_ATHLETICS_TRACK,
        seasonStart: new Date('2026-01-01'),
        seasonEnd: new Date('2026-12-31'),
      },
    ]);
    performanceService.findMatchHistoryForStudent.mockResolvedValue([
      { matchId: 'm1', date: new Date('2026-03-01'), metricValues: { 'Finish time': 11.5 } },
    ]);
    snapshotService.findLatestSnapshotsForStudent.mockResolvedValue([
      { metricName: 'Finish time', trendFlag: TrendFlag.IMPROVING, seasonAvg: 11.8 },
    ]);

    const result = await service.getMyProfile(STUDENT_ID);

    expect(result).toHaveLength(1);
    expect(result[0].sport).toEqual({
      id: 'sport-1',
      name: 'Athletics',
      sportType: SPORT_TYPE_ATHLETICS_TRACK,
      seasonStart: new Date('2026-01-01'),
      seasonEnd: new Date('2026-12-31'),
    });
    expect(result[0].matchHistory).toHaveLength(1);
    expect(result[0].metricSnapshots).toHaveLength(1);
    expect(performanceService.findMatchHistoryForStudent).toHaveBeenCalledWith('sport-1', STUDENT_ID);
    expect(snapshotService.findLatestSnapshotsForStudent).toHaveBeenCalledWith('sport-1', STUDENT_ID);
  });

  it('composes a profile entry per sport when enrolled in multiple sports', async () => {
    sportsService.findEnrolledSports.mockResolvedValue([
      { id: 'sport-1', name: 'Athletics', sportType: SPORT_TYPE_ATHLETICS_TRACK, seasonStart: new Date(), seasonEnd: new Date() },
      { id: 'sport-2', name: 'Chess', sportType: SPORT_TYPE_CHESS, seasonStart: new Date(), seasonEnd: new Date() },
    ]);
    performanceService.findMatchHistoryForStudent.mockResolvedValue([]);
    snapshotService.findLatestSnapshotsForStudent.mockResolvedValue([]);

    const result = await service.getMyProfile(STUDENT_ID);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.sport.id)).toEqual(['sport-1', 'sport-2']);
  });
});
