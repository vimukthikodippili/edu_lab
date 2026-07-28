import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

// FR-MHA-28. Deliberately an extensible union with exactly one member today — the Student
// Timeline (FR-SM-09) itself doesn't exist elsewhere in this codebase yet (no attendance/marks/
// behavior-notes/achievements event sourcing), so this story builds the feed with `mha_session`
// as its only source rather than inventing unrelated event types no AC asks for.
export type TimelineEventType = 'mha_session';

// AC #89 — literal field list only: date, case number, highest risk-category level. No domain
// names, no risk-category names, no notes (EXCL-02 — never a clinical/diagnostic label).
export interface MhaSessionTimelineEventDto {
  type: 'mha_session';
  date: Date;
  caseNumber: string;
  maxLevel: DomainResultLevel;
  sessionId: string;
}

export type TimelineEventDto = MhaSessionTimelineEventDto;

export interface StudentTimelineResponseDto {
  studentId: string;
  events: TimelineEventDto[];
}
