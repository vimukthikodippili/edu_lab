import { TrendFlag, YearOnYearFlag } from '../entities/sport-student-snapshot.entity';
import type { PersonalBestComparisonMode } from './performance-rules';

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Straight average of the most recent (up to) 4 match values for a metric. */
export function computeRollingAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return average(values.slice(-4));
}

/** Average across every value recorded this season. */
export function computeSeasonAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return average(values);
}

/** The single best value this season, direction-aware (lower is better for a time metric,
 * higher is better for everything else). */
export function computeBestValue(
  values: number[],
  direction: PersonalBestComparisonMode,
): number | null {
  if (values.length === 0) return null;
  return direction === 'lower_is_better' ? Math.min(...values) : Math.max(...values);
}

/** FR-P3-PA-02: "Improving if last 2 averages are higher than prior 2, Declining if lower,
 * Stable otherwise" — based on the last 4 match performances. Direction-aware: for a
 * lower_is_better metric (e.g. Finish time), a *lower* recent pair is the real improvement,
 * so the raw numeric comparison is inverted. Fewer than 4 data points is deliberately never
 * enough to claim a real trend — returns Stable rather than a fabricated signal. */
export function computeTrendFlag(
  values: number[],
  direction: PersonalBestComparisonMode,
): TrendFlag {
  const last4 = values.slice(-4);
  if (last4.length < 4) return TrendFlag.STABLE;

  const priorTwoAvg = average(last4.slice(0, 2));
  const lastTwoAvg = average(last4.slice(2, 4));

  if (lastTwoAvg === priorTwoAvg) return TrendFlag.STABLE;
  const isNumericallyHigher = lastTwoAvg > priorTwoAvg;
  const isImprovement = direction === 'lower_is_better' ? !isNumericallyHigher : isNumericallyHigher;
  return isImprovement ? TrendFlag.IMPROVING : TrendFlag.DECLINING;
}

/** FR-P3-PA-06: "Auto-flag if a student is performing significantly better or worse than last
 * year (configurable threshold)." Direction-aware exactly like computeTrendFlag — a lower
 * seasonAvg than lastSeasonAvg is an improvement for a lower_is_better metric, not a decline,
 * despite being numerically smaller. A percent change whose absolute value is under the
 * threshold reads as Similar, never a forced Better/Worse verdict on noise-level movement. */
export function computeYearOnYearFlag(
  seasonAvg: number,
  lastSeasonAvg: number,
  thresholdPercent: number,
  direction: PersonalBestComparisonMode,
): YearOnYearFlag {
  // A zero baseline makes "percent change" undefined — no meaningful verdict can be claimed,
  // so this reads as Similar rather than guessing a direction.
  if (lastSeasonAvg === 0) return YearOnYearFlag.SIMILAR;

  const percentChange = ((seasonAvg - lastSeasonAvg) / Math.abs(lastSeasonAvg)) * 100;
  if (Math.abs(percentChange) < thresholdPercent) return YearOnYearFlag.SIMILAR;

  const isNumericallyHigher = percentChange > 0;
  const isImprovement = direction === 'lower_is_better' ? !isNumericallyHigher : isNumericallyHigher;
  return isImprovement ? YearOnYearFlag.BETTER : YearOnYearFlag.WORSE;
}
