export type LabAvailabilityStatus = 'available' | 'booked' | 'maintenance';

/** Mirrors live-class-monitor/class-status.ts's computePeriodStart — same global,
 * uniform-duration freePeriod config, duplicated here per this codebase's established
 * per-module convention for this exact helper (already duplicated between
 * ClassCheckInService and TeacherTasksService). Returns the real wall-clock window a period
 * number occupies on a given day. */
export function computePeriodWindow(
  day: Date,
  period: number,
  schoolStartTime: string,
  periodDurationMinutes: number,
): { start: Date; end: Date } {
  const [startHour, startMinute] = schoolStartTime.split(':').map(Number);
  const start = new Date(day);
  start.setHours(startHour, startMinute, 0, 0);
  start.setMinutes(start.getMinutes() + (period - 1) * periodDurationMinutes);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + periodDurationMinutes);

  return { start, end };
}

/** Maintenance always wins, regardless of any concurrent booking — a lab pulled for
 * maintenance is not bookable even if a (stale or otherwise) booking row exists for now. */
export function computeLabAvailabilityStatus(
  isUnderMaintenance: boolean,
  hasActiveBooking: boolean,
): LabAvailabilityStatus {
  if (isUnderMaintenance) return 'maintenance';
  if (hasActiveBooking) return 'booked';
  return 'available';
}
