import { computeLabReportStatus } from './lab-report-status';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';

const DUE_DATE = '2026-08-15';

describe('computeLabReportStatus — the explicitly-requested late-status computation test', () => {
  it('returns "pending" when there is no submission and the due date has not passed', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    expect(computeLabReportStatus(null, DUE_DATE, now)).toBe('pending');
  });

  it('returns "pending" right up to the last moment of the due date', () => {
    const now = new Date('2026-08-15T23:59:59.998Z');
    expect(computeLabReportStatus(null, DUE_DATE, now)).toBe('pending');
  });

  it('returns "late" when there is no submission and the due date has passed', () => {
    const now = new Date('2026-08-16T00:00:00.001Z');
    expect(computeLabReportStatus(null, DUE_DATE, now)).toBe('late');
  });

  it('returns "submitted" when a submission exists, even if it was submitted after the due date (per this story\'s own literal definition — "late" only applies when nothing was ever submitted)', () => {
    const now = new Date('2026-08-20T00:00:00.000Z');
    const submission = { grade: null } as LabReportSubmissionEntity;
    expect(computeLabReportStatus(submission, DUE_DATE, now)).toBe('submitted');
  });

  it('returns "graded" whenever a grade has been recorded, taking priority over "submitted"', () => {
    const submission = { grade: '18.00' } as LabReportSubmissionEntity;
    expect(computeLabReportStatus(submission, DUE_DATE)).toBe('graded');
  });

  it('treats a grade of 0 as graded (not falsy-skipped)', () => {
    const submission = { grade: '0.00' } as LabReportSubmissionEntity;
    expect(computeLabReportStatus(submission, DUE_DATE)).toBe('graded');
  });
});
