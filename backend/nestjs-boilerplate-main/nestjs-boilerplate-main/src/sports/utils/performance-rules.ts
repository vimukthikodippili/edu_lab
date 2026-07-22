import { SportMetricEntity } from '../entities/sport-metric.entity';

export type PersonalBestComparisonMode = 'lower_is_better' | 'higher_is_better';

/** A first-ever recorded result is trivially a personal best — there is nothing to beat yet. */
export function isPersonalBest(
  currentValue: number,
  priorValues: number[],
  mode: PersonalBestComparisonMode,
): boolean {
  if (priorValues.length === 0) return true;
  return mode === 'lower_is_better'
    ? currentValue < Math.min(...priorValues)
    : currentValue > Math.max(...priorValues);
}

/** FR-P3-MR-08's explicitly-requested rule: non-negative for plain counts, strictly positive
 * for time/distance/height metrics (a time or distance of exactly zero is never a real result). */
export function validateMetricValue(value: number, metric: SportMetricEntity): string | null {
  if (metric.isTimeBased || metric.isDistanceBased) {
    return value > 0 ? null : `${metric.metricName} must be a positive value.`;
  }
  return value >= 0 ? null : `${metric.metricName} cannot be negative.`;
}
