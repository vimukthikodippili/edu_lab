import { Injectable } from '@nestjs/common';
import { SportEntity } from './entities/sport.entity';
import { SportsService } from './sports.service';
import { PerformanceService, MatchHistoryRow } from './performance.service';
import { SnapshotService, StudentMetricSnapshot } from './snapshot.service';

export interface StudentSportProfile {
  sport: Pick<SportEntity, 'id' | 'name' | 'sportType' | 'seasonStart' | 'seasonEnd'>;
  matchHistory: MatchHistoryRow[];
  metricSnapshots: StudentMetricSnapshot[];
}

/** FR-P3-AV-05/06: a 4th distinct concern alongside SportsService/PerformanceService/
 * SnapshotService — read-only aggregation across all three, keyed by studentId instead of
 * sportId/staffId. Pure composition, no new business logic of its own; all authorization
 * happens once, before this is ever called, at the self-view controller layer. */
@Injectable()
export class StudentSportsService {
  constructor(
    private readonly sportsService: SportsService,
    private readonly performanceService: PerformanceService,
    private readonly snapshotService: SnapshotService,
  ) {}

  async getMyProfile(studentId: string): Promise<StudentSportProfile[]> {
    const sports = await this.sportsService.findEnrolledSports(studentId);

    return Promise.all(
      sports.map(async (sport) => {
        const [matchHistory, metricSnapshots] = await Promise.all([
          this.performanceService.findMatchHistoryForStudent(sport.id, studentId),
          this.snapshotService.findLatestSnapshotsForStudent(sport.id, studentId),
        ]);

        return {
          sport: {
            id: sport.id,
            name: sport.name,
            sportType: sport.sportType,
            seasonStart: sport.seasonStart,
            seasonEnd: sport.seasonEnd,
          },
          matchHistory,
          metricSnapshots,
        };
      }),
    );
  }
}
