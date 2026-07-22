import {
  computeRollingAvg,
  computeSeasonAvg,
  computeBestValue,
  computeTrendFlag,
  computeYearOnYearFlag,
} from './trend-rules';
import { TrendFlag, YearOnYearFlag } from '../entities/sport-student-snapshot.entity';

describe('computeTrendFlag — the explicitly-requested test, at each of the three states', () => {
  describe('higher_is_better (e.g. Runs scored)', () => {
    it('flags Improving when the last 2 matches average higher than the prior 2', () => {
      // prior pair avg = 20, last pair avg = 35
      expect(computeTrendFlag([15, 25, 30, 40], 'higher_is_better')).toBe(TrendFlag.IMPROVING);
    });

    it('flags Declining when the last 2 matches average lower than the prior 2', () => {
      // prior pair avg = 35, last pair avg = 20
      expect(computeTrendFlag([30, 40, 15, 25], 'higher_is_better')).toBe(TrendFlag.DECLINING);
    });

    it('flags Stable when the last 2 and prior 2 averages are equal', () => {
      expect(computeTrendFlag([20, 20, 20, 20], 'higher_is_better')).toBe(TrendFlag.STABLE);
    });
  });

  describe('lower_is_better (e.g. Finish time) — direction-aware, not a raw numeric comparison', () => {
    it('flags Improving when the last 2 matches are numerically LOWER (faster) than the prior 2', () => {
      // prior pair avg = 13.0, last pair avg = 11.5 — numerically lower, but a real improvement
      expect(computeTrendFlag([13.2, 12.8, 11.6, 11.4], 'lower_is_better')).toBe(TrendFlag.IMPROVING);
    });

    it('flags Declining when the last 2 matches are numerically HIGHER (slower) than the prior 2', () => {
      // prior pair avg = 11.5, last pair avg = 13.0 — numerically higher, a real decline
      expect(computeTrendFlag([11.6, 11.4, 13.2, 12.8], 'lower_is_better')).toBe(TrendFlag.DECLINING);
    });

    it('flags Stable when the last 2 and prior 2 averages are equal', () => {
      expect(computeTrendFlag([12.0, 12.0, 12.0, 12.0], 'lower_is_better')).toBe(TrendFlag.STABLE);
    });
  });

  describe('insufficient data', () => {
    it('flags Stable with fewer than 4 recorded matches — never a fabricated trend', () => {
      expect(computeTrendFlag([], 'higher_is_better')).toBe(TrendFlag.STABLE);
      expect(computeTrendFlag([10], 'higher_is_better')).toBe(TrendFlag.STABLE);
      expect(computeTrendFlag([10, 20, 30], 'higher_is_better')).toBe(TrendFlag.STABLE);
    });

    it('uses only the most recent 4 when more than 4 are given', () => {
      // Only the last 4 values (30,40,15,25) matter: prior pair avg=35, last pair avg=20 -> Declining
      expect(computeTrendFlag([1, 1, 30, 40, 15, 25], 'higher_is_better')).toBe(TrendFlag.DECLINING);
    });
  });
});

describe('computeRollingAvg', () => {
  it('averages the most recent 4 values', () => {
    expect(computeRollingAvg([10, 20, 30, 40])).toBe(25);
  });

  it('uses only the last 4 when more are given', () => {
    expect(computeRollingAvg([100, 100, 10, 20, 30, 40])).toBe(25);
  });

  it('returns null for no data', () => {
    expect(computeRollingAvg([])).toBeNull();
  });
});

describe('computeSeasonAvg', () => {
  it('averages every value across the season', () => {
    expect(computeSeasonAvg([10, 20, 30])).toBeCloseTo(20);
  });

  it('returns null for no data', () => {
    expect(computeSeasonAvg([])).toBeNull();
  });
});

describe('computeBestValue', () => {
  it('picks the maximum for higher_is_better', () => {
    expect(computeBestValue([10, 25, 15], 'higher_is_better')).toBe(25);
  });

  it('picks the minimum for lower_is_better', () => {
    expect(computeBestValue([13.2, 11.8, 12.5], 'lower_is_better')).toBe(11.8);
  });

  it('returns null for no data', () => {
    expect(computeBestValue([], 'higher_is_better')).toBeNull();
  });
});

describe('computeYearOnYearFlag — the explicitly-requested threshold calculation test', () => {
  describe('higher_is_better (e.g. Runs scored), threshold 10%', () => {
    it('flags Better when the increase exceeds the threshold', () => {
      // (30 - 20) / 20 = +50%
      expect(computeYearOnYearFlag(30, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.BETTER);
    });

    it('flags Worse when the decrease exceeds the threshold', () => {
      // (15 - 20) / 20 = -25%
      expect(computeYearOnYearFlag(15, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.WORSE);
    });

    it('flags Similar when the change is within the threshold', () => {
      // (21 - 20) / 20 = +5%
      expect(computeYearOnYearFlag(21, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.SIMILAR);
    });

    it('flags Better (not Similar) exactly at the threshold boundary (strict inequality)', () => {
      // (22 - 20) / 20 = +10%, not < 10 — an increase, so Better for a higher_is_better metric
      expect(computeYearOnYearFlag(22, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.BETTER);
      // one hundredth below the boundary is Similar
      expect(computeYearOnYearFlag(21.98, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.SIMILAR);
    });
  });

  describe('lower_is_better (e.g. Finish time) — direction-aware, not a raw numeric comparison, threshold 10%', () => {
    it('flags Better when the time drops (gets faster) beyond the threshold', () => {
      // (11 - 13) / 13 ≈ -15.4% — numerically lower, a real improvement
      expect(computeYearOnYearFlag(11, 13, 10, 'lower_is_better')).toBe(YearOnYearFlag.BETTER);
    });

    it('flags Worse when the time rises (gets slower) beyond the threshold', () => {
      // (14 - 12) / 12 ≈ +16.7% — numerically higher, a real decline
      expect(computeYearOnYearFlag(14, 12, 10, 'lower_is_better')).toBe(YearOnYearFlag.WORSE);
    });

    it('flags Similar when the change is within the threshold', () => {
      // (12.5 - 12) / 12 ≈ +4.2%
      expect(computeYearOnYearFlag(12.5, 12, 10, 'lower_is_better')).toBe(YearOnYearFlag.SIMILAR);
    });
  });

  it('respects a custom threshold percentage', () => {
    // (25 - 20) / 20 = +25% — Similar at a 30% threshold, Better at a 10% threshold
    expect(computeYearOnYearFlag(25, 20, 30, 'higher_is_better')).toBe(YearOnYearFlag.SIMILAR);
    expect(computeYearOnYearFlag(25, 20, 10, 'higher_is_better')).toBe(YearOnYearFlag.BETTER);
  });

  it('returns Similar when the prior season average is zero — a percent change is undefined, not a guess', () => {
    expect(computeYearOnYearFlag(5, 0, 10, 'higher_is_better')).toBe(YearOnYearFlag.SIMILAR);
  });
});
