import 'reflect-metadata';
import { computeClassStatus, computePeriodStart } from './class-status';

describe('computePeriodStart', () => {
  it('computes period 1 start as exactly the school start time', () => {
    const day = new Date(2026, 0, 5); // Monday
    const start = computePeriodStart(day, 1, '07:30', 40);
    expect(start.getHours()).toBe(7);
    expect(start.getMinutes()).toBe(30);
  });

  it('computes a later period start by adding (period-1) * duration minutes', () => {
    const day = new Date(2026, 0, 5);
    const start = computePeriodStart(day, 3, '07:30', 40); // 07:30 + 80min = 08:50
    expect(start.getHours()).toBe(8);
    expect(start.getMinutes()).toBe(50);
  });
});

describe('computeClassStatus', () => {
  const periodStart = new Date(2026, 0, 5, 9, 0);
  const lateThresholdMinutes = 10;

  it('returns grey when the period has not started yet', () => {
    const now = new Date(2026, 0, 5, 8, 59);
    expect(computeClassStatus(periodStart, now, false, lateThresholdMinutes)).toBe('grey');
  });

  it('returns green when a check-in exists, regardless of elapsed time', () => {
    const now = new Date(2026, 0, 5, 9, 30); // well past the threshold
    expect(computeClassStatus(periodStart, now, true, lateThresholdMinutes)).toBe('green');
  });

  it('returns amber exactly 1 minute before the threshold', () => {
    const now = new Date(2026, 0, 5, 9, 9); // 9 minutes elapsed
    expect(computeClassStatus(periodStart, now, false, lateThresholdMinutes)).toBe('amber');
  });

  it('returns red exactly at the threshold', () => {
    const now = new Date(2026, 0, 5, 9, 10); // exactly 10 minutes elapsed
    expect(computeClassStatus(periodStart, now, false, lateThresholdMinutes)).toBe('red');
  });

  it('returns red exactly 1 minute after the threshold', () => {
    const now = new Date(2026, 0, 5, 9, 11); // 11 minutes elapsed
    expect(computeClassStatus(periodStart, now, false, lateThresholdMinutes)).toBe('red');
  });
});
