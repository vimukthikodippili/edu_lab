import { computeRecurringDates } from './lab-recurring';

describe('computeRecurringDates', () => {
  it('returns every Monday (dayOfWeek=1) in a short 2-week range', () => {
    // 2026-08-03 and 2026-08-10 are Mondays.
    expect(computeRecurringDates('2026-08-01', '2026-08-14', 1)).toEqual([
      '2026-08-03',
      '2026-08-10',
    ]);
  });

  it('returns the exact count for a full term-length range', () => {
    // 2026-09-01 (Tue) .. 2026-11-24 (Tue) — every Tuesday inclusive.
    const dates = computeRecurringDates('2026-09-01', '2026-11-24', 2);
    expect(dates).toHaveLength(13);
    expect(dates[0]).toBe('2026-09-01');
    expect(dates[dates.length - 1]).toBe('2026-11-24');
  });

  it('returns an empty array when the weekday never occurs in the range', () => {
    // 2026-08-03 (Mon) .. 2026-08-07 (Fri) contains no Saturday.
    expect(computeRecurringDates('2026-08-03', '2026-08-07', 6)).toEqual([]);
  });

  it('includes the start date itself when it is already the target weekday', () => {
    expect(computeRecurringDates('2026-08-03', '2026-08-03', 1)).toEqual(['2026-08-03']);
  });

  it('includes the end date itself when it is exactly the target weekday', () => {
    // 2026-08-02 (Sun) .. 2026-08-08 (Sat) — only the end date is a Saturday.
    expect(computeRecurringDates('2026-08-02', '2026-08-08', 6)).toEqual(['2026-08-08']);
  });
});
