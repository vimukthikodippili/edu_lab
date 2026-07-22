/** Given a term's [startDate, endDate] (inclusive, "YYYY-MM-DD") and a target weekday
 * (1=Mon..6=Sat, matching TimetableEntryEntity.day's convention — the DTO-level `@Min(1)
 * @Max(6)` is what keeps Sunday out of range, this function itself just follows JS's
 * getUTCDay() convention where 0..6 already lines up with our 1..6 range), returns every real
 * calendar date in that range landing on that weekday, ascending. Pure and DB-free so the
 * recurring-booking generation count can be tested directly. */
export function computeRecurringDates(startDate: string, endDate: string, dayOfWeek: number): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  const dates: string[] = [];
  const cursor = new Date(start);

  // JS getUTCDay(): 0=Sun..6=Sat, which already lines up with our 1=Mon..6=Sat convention.
  const offsetToFirstMatch = (dayOfWeek - cursor.getUTCDay() + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + offsetToFirstMatch);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return dates;
}
