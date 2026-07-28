import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

// FR-MHA-34/AC #94 — the wellbeing KPI's drill-down row. `maxLevel` matches the AI prompt's
// literal field name for this response (MhaCaseloadItem's own `highestRiskLevel` field is
// untouched — this is a separate, renamed view over the same underlying data).
export interface WellbeingConcernDto {
  studentId: string;
  studentName: string;
  grade: string;
  maxLevel: DomainResultLevel;
}
