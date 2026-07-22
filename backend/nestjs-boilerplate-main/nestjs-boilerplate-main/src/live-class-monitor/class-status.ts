export type ClassMonitorStatus = 'green' | 'amber' | 'red' | 'grey';

/** periodStart(N) = schoolStartTime + (N-1) * periodDurationMinutes — the inverse of
 * ClassCheckInService.getCurrentPeriod's elapsed/duration formula, against the same
 * global, uniform-duration config (no per-grade override exists in this codebase). */
export function computePeriodStart(
  day: Date,
  period: number,
  schoolStartTime: string,
  periodDurationMinutes: number,
): Date {
  const [startHour, startMinute] = schoolStartTime.split(':').map(Number);
  const start = new Date(day);
  start.setHours(startHour, startMinute, 0, 0);
  start.setMinutes(start.getMinutes() + (period - 1) * periodDurationMinutes);
  return start;
}

export function computeClassStatus(
  periodStart: Date,
  now: Date,
  hasCheckIn: boolean,
  lateThresholdMinutes: number,
): ClassMonitorStatus {
  if (now < periodStart) return 'grey';
  if (hasCheckIn) return 'green';
  const elapsedMinutes = (now.getTime() - periodStart.getTime()) / 60000;
  return elapsedMinutes >= lateThresholdMinutes ? 'red' : 'amber';
}
