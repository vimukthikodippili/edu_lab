import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportMetricEntity } from '../../../../sports/entities/sport-metric.entity';
import { SportTypeEntity } from '../../../../sports/entities/sport-type.entity';

interface SeedMetric {
  sportTypeName: string;
  metricName: string;
  unit: string | null;
  isTimeBased: boolean;
  isDistanceBased: boolean;
  ordering: number;
}

// Starting-point metrics per SRS Phase 3 §1.4 — no longer fixed forever: an Admin/Principal can
// add/edit/remove metrics for any sport type (including these original 13) via
// SportTypeController, same as the sport types themselves.
const METRICS: SeedMetric[] = [
  // Cricket
  { sportTypeName: 'Cricket', metricName: 'Runs scored', unit: 'runs', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Cricket', metricName: 'Balls faced', unit: 'balls', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Cricket', metricName: 'Wickets taken', unit: 'wickets', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Cricket', metricName: 'Overs bowled', unit: 'overs', isTimeBased: false, isDistanceBased: false, ordering: 4 },
  { sportTypeName: 'Cricket', metricName: 'Catches', unit: 'catches', isTimeBased: false, isDistanceBased: false, ordering: 5 },
  { sportTypeName: 'Cricket', metricName: 'Run-outs', unit: 'run-outs', isTimeBased: false, isDistanceBased: false, ordering: 6 },

  // Football (Soccer)
  { sportTypeName: 'Football (Soccer)', metricName: 'Goals scored', unit: 'goals', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Football (Soccer)', metricName: 'Assists', unit: 'assists', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Football (Soccer)', metricName: 'Saves (goalkeeper)', unit: 'saves', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Football (Soccer)', metricName: 'Yellow cards', unit: 'cards', isTimeBased: false, isDistanceBased: false, ordering: 4 },
  { sportTypeName: 'Football (Soccer)', metricName: 'Red cards', unit: 'cards', isTimeBased: false, isDistanceBased: false, ordering: 5 },
  { sportTypeName: 'Football (Soccer)', metricName: 'Minutes played', unit: 'minutes', isTimeBased: true, isDistanceBased: false, ordering: 6 },

  // Volleyball
  { sportTypeName: 'Volleyball', metricName: 'Points scored', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Volleyball', metricName: 'Serves', unit: 'serves', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Volleyball', metricName: 'Blocks', unit: 'blocks', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Volleyball', metricName: 'Aces', unit: 'aces', isTimeBased: false, isDistanceBased: false, ordering: 4 },
  { sportTypeName: 'Volleyball', metricName: 'Errors', unit: 'errors', isTimeBased: false, isDistanceBased: false, ordering: 5 },

  // Basketball
  { sportTypeName: 'Basketball', metricName: 'Points scored', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Basketball', metricName: 'Rebounds', unit: 'rebounds', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Basketball', metricName: 'Assists', unit: 'assists', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Basketball', metricName: 'Steals', unit: 'steals', isTimeBased: false, isDistanceBased: false, ordering: 4 },
  { sportTypeName: 'Basketball', metricName: 'Blocks', unit: 'blocks', isTimeBased: false, isDistanceBased: false, ordering: 5 },
  { sportTypeName: 'Basketball', metricName: 'Fouls', unit: 'fouls', isTimeBased: false, isDistanceBased: false, ordering: 6 },

  // Netball
  { sportTypeName: 'Netball', metricName: 'Goals scored', unit: 'goals', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Netball', metricName: 'Goal attempts', unit: 'attempts', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Netball', metricName: 'Intercepts', unit: 'intercepts', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Netball', metricName: 'Centre passes', unit: 'passes', isTimeBased: false, isDistanceBased: false, ordering: 4 },

  // Athletics — Track
  { sportTypeName: 'Athletics — Track', metricName: 'Finish time', unit: 'seconds', isTimeBased: true, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Athletics — Track', metricName: 'Rank/position', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Athletics — Track', metricName: 'Personal best flag', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 3 },

  // Athletics — Field
  { sportTypeName: 'Athletics — Field', metricName: 'Distance/Height achieved', unit: 'metres', isTimeBased: false, isDistanceBased: true, ordering: 1 },
  { sportTypeName: 'Athletics — Field', metricName: 'Rank/position', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Athletics — Field', metricName: 'Personal best flag', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 3 },

  // Badminton
  { sportTypeName: 'Badminton', metricName: 'Sets won', unit: 'sets', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Badminton', metricName: 'Points won', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Badminton', metricName: 'Points lost', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 3 },

  // Table Tennis
  { sportTypeName: 'Table Tennis', metricName: 'Sets won', unit: 'sets', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Table Tennis', metricName: 'Points won', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Table Tennis', metricName: 'Points lost', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 3 },

  // Swimming
  { sportTypeName: 'Swimming', metricName: 'Finish time', unit: 'seconds', isTimeBased: true, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Swimming', metricName: 'Rank/position', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Swimming', metricName: 'Stroke type', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Swimming', metricName: 'Distance', unit: 'metres', isTimeBased: false, isDistanceBased: true, ordering: 4 },
  { sportTypeName: 'Swimming', metricName: 'Personal best flag', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 5 },

  // Rugger (Rugby)
  { sportTypeName: 'Rugger (Rugby)', metricName: 'Tries scored', unit: 'tries', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Rugger (Rugby)', metricName: 'Conversions', unit: 'conversions', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Rugger (Rugby)', metricName: 'Tackles', unit: 'tackles', isTimeBased: false, isDistanceBased: false, ordering: 3 },
  { sportTypeName: 'Rugger (Rugby)', metricName: 'Minutes played', unit: 'minutes', isTimeBased: true, isDistanceBased: false, ordering: 4 },

  // Chess
  { sportTypeName: 'Chess', metricName: 'Win/Loss/Draw result', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Chess', metricName: 'Opponent rating', unit: 'rating', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Chess', metricName: 'Round number', unit: null, isTimeBased: false, isDistanceBased: false, ordering: 3 },

  // Carom
  { sportTypeName: 'Carom', metricName: 'Points scored', unit: 'points', isTimeBased: false, isDistanceBased: false, ordering: 1 },
  { sportTypeName: 'Carom', metricName: 'Frames won', unit: 'frames', isTimeBased: false, isDistanceBased: false, ordering: 2 },
  { sportTypeName: 'Carom', metricName: 'Frames lost', unit: 'frames', isTimeBased: false, isDistanceBased: false, ordering: 3 },
];

@Injectable()
export class SportMetricSeedService {
  constructor(
    @InjectRepository(SportMetricEntity)
    private readonly sportMetricRepository: Repository<SportMetricEntity>,

    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepository: Repository<SportTypeEntity>,
  ) {}

  // Depends on SportTypeSeedService having already run — run-seed.ts orders this explicitly.
  async run(): Promise<void> {
    for (const metric of METRICS) {
      const sportType = await this.sportTypeRepository.findOne({
        where: { name: metric.sportTypeName },
      });
      if (!sportType) continue; // sport type seed hasn't run, or was renamed/removed since

      const exists = await this.sportMetricRepository.findOne({
        where: { sportTypeId: sportType.id, metricName: metric.metricName },
      });
      if (!exists) {
        await this.sportMetricRepository.save(
          this.sportMetricRepository.create({
            sportTypeId: sportType.id,
            metricName: metric.metricName,
            unit: metric.unit,
            isTimeBased: metric.isTimeBased,
            isDistanceBased: metric.isDistanceBased,
            ordering: metric.ordering,
          }),
        );
      }
    }
  }
}
