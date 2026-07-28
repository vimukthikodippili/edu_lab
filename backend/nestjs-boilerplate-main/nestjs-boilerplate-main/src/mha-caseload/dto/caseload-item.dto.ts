import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

/** FR-MHA-31/AC #73-75. `highestRiskLevel` is scoped to the student's single LATEST completed
 * session only (AC #73's literal wording); `hasSafetyFlag` is a lifetime, cross-session flag
 * (AC #75 — "regardless of session age"), which is why it can't be read off the latest session
 * alone and needs its own separate aggregate. */
export interface CaseloadItemDto {
  studentId: string;
  studentName: string;
  grade: string;
  latestSessionId: string;
  latestSessionDate: Date;
  highestRiskLevel: DomainResultLevel;
  hasPendingActions: boolean;
  hasSafetyFlag: boolean;
}
