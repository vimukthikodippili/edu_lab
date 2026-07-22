import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';

export type LabReportSubmissionStatus = 'pending' | 'late' | 'submitted' | 'graded';

/** Pure, directly-testable status derivation — the explicitly-requested "late-status
 * computation" test target. Mirrors the story's own literal definition exactly (a deliberate
 * departure from LMS Homework's own `computeRosterStatus`, whose "late" instead means "submitted
 * after the due date" — here "late" means no submission at all, past due):
 * pending = no submission and before due; late = no submission and past due;
 * submitted = submission exists; graded = grade IS NOT NULL (takes priority over "submitted"). */
export function computeLabReportStatus(
  submission: LabReportSubmissionEntity | null,
  dueDate: string,
  now: Date = new Date(),
): LabReportSubmissionStatus {
  if (submission) {
    return submission.grade != null ? 'graded' : 'submitted';
  }
  const endOfDueDate = new Date(`${dueDate}T23:59:59.999Z`);
  return now > endOfDueDate ? 'late' : 'pending';
}
