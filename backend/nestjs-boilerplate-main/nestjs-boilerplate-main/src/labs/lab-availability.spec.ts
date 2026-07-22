import { computeLabAvailabilityStatus, computePeriodWindow } from './lab-availability';

describe('computeLabAvailabilityStatus', () => {
  it('is "maintenance" when under maintenance, regardless of an active booking', () => {
    expect(computeLabAvailabilityStatus(true, true)).toBe('maintenance');
    expect(computeLabAvailabilityStatus(true, false)).toBe('maintenance');
  });

  it('is "booked" when there is an active booking and no maintenance', () => {
    expect(computeLabAvailabilityStatus(false, true)).toBe('booked');
  });

  it('is "available" when neither maintenance nor an active booking', () => {
    expect(computeLabAvailabilityStatus(false, false)).toBe('available');
  });
});

describe('computePeriodWindow', () => {
  it('computes the correct start/end for period 1 at the school start time', () => {
    const day = new Date('2026-08-15T00:00:00Z');
    const { start, end } = computePeriodWindow(day, 1, '07:30', 40);

    expect(start.getHours()).toBe(7);
    expect(start.getMinutes()).toBe(30);
    expect(end.getHours()).toBe(8);
    expect(end.getMinutes()).toBe(10);
  });

  it('offsets later periods by (period - 1) * duration', () => {
    const day = new Date('2026-08-15T00:00:00Z');
    const { start, end } = computePeriodWindow(day, 3, '07:30', 40);

    // Period 3 starts 2*40 = 80 minutes after 07:30 → 08:50
    expect(start.getHours()).toBe(8);
    expect(start.getMinutes()).toBe(50);
    expect(end.getHours()).toBe(9);
    expect(end.getMinutes()).toBe(30);
  });
});
