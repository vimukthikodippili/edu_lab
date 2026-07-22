import { isPersonalBest, validateMetricValue } from './performance-rules';
import { SportMetricEntity } from '../entities/sport-metric.entity';

const makeMetric = (overrides: Partial<SportMetricEntity> = {}): SportMetricEntity =>
  ({
    id: 'metric-uuid',
    sportTypeId: 'st-athletics-track',
    metricName: 'Finish time',
    unit: 'seconds',
    isTimeBased: false,
    isDistanceBased: false,
    ordering: 1,
    ...overrides,
  } as SportMetricEntity);

describe('isPersonalBest — the explicitly-requested personal-best computation test', () => {
  it('a first-ever recorded result is trivially a personal best', () => {
    expect(isPersonalBest(12.5, [], 'lower_is_better')).toBe(true);
    expect(isPersonalBest(4.2, [], 'higher_is_better')).toBe(true);
  });

  describe('lower_is_better (time)', () => {
    it('a faster time than every prior result is a personal best', () => {
      expect(isPersonalBest(11.8, [12.5, 12.1, 12.9], 'lower_is_better')).toBe(true);
    });

    it('a slower time than the existing best is not a personal best', () => {
      expect(isPersonalBest(12.6, [12.5, 12.1, 12.9], 'lower_is_better')).toBe(false);
    });

    it('a tie with the existing best is not a new personal best', () => {
      expect(isPersonalBest(12.1, [12.5, 12.1, 12.9], 'lower_is_better')).toBe(false);
    });
  });

  describe('higher_is_better (distance/height)', () => {
    it('a longer distance than every prior result is a personal best', () => {
      expect(isPersonalBest(6.2, [5.8, 6.0, 5.5], 'higher_is_better')).toBe(true);
    });

    it('a shorter distance than the existing best is not a personal best', () => {
      expect(isPersonalBest(5.9, [5.8, 6.0, 5.5], 'higher_is_better')).toBe(false);
    });

    it('a tie with the existing best is not a new personal best', () => {
      expect(isPersonalBest(6.0, [5.8, 6.0, 5.5], 'higher_is_better')).toBe(false);
    });
  });
});

describe('validateMetricValue — the explicitly-requested validation rule', () => {
  it('rejects a negative value for a plain count metric', () => {
    const metric = makeMetric({ metricName: 'Runs scored', isTimeBased: false, isDistanceBased: false });
    expect(validateMetricValue(-1, metric)).toMatch(/cannot be negative/);
  });

  it('allows zero for a plain count metric', () => {
    const metric = makeMetric({ metricName: 'Goals scored', isTimeBased: false, isDistanceBased: false });
    expect(validateMetricValue(0, metric)).toBeNull();
  });

  it('rejects a zero or negative value for a time-based metric', () => {
    const metric = makeMetric({ metricName: 'Finish time', isTimeBased: true, isDistanceBased: false });
    expect(validateMetricValue(0, metric)).toMatch(/positive value/);
    expect(validateMetricValue(-5, metric)).toMatch(/positive value/);
  });

  it('rejects a zero or negative value for a distance-based metric', () => {
    const metric = makeMetric({ metricName: 'Distance/Height achieved', isTimeBased: false, isDistanceBased: true });
    expect(validateMetricValue(0, metric)).toMatch(/positive value/);
  });

  it('allows a positive value for a time/distance metric', () => {
    const metric = makeMetric({ metricName: 'Finish time', isTimeBased: true, isDistanceBased: false });
    expect(validateMetricValue(11.8, metric)).toBeNull();
  });
});
