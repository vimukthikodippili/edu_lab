// A sport type is now an admin-managed catalog entry (table-backed, not a hardcoded enum) — an
// Admin/Principal can add a new type (e.g. Karate) without a code change. See useSportTypes.ts.
export interface SportType {
  id: string
  name: string
  isPersonalBestEligible: boolean
  createdAt: string
  updatedAt: string
}

export interface SportTypeMetric {
  id: string
  sportTypeId: string
  metricName: string
  unit: string | null
  isTimeBased: boolean
  isDistanceBased: boolean
  ordering: number
}

export interface CreateSportTypePayload {
  name: string
  isPersonalBestEligible?: boolean
}

export interface UpdateSportTypePayload {
  name?: string
  isPersonalBestEligible?: boolean
}

export interface CreateSportTypeMetricPayload {
  metricName: string
  unit?: string
  isTimeBased?: boolean
  isDistanceBased?: boolean
  ordering: number
}

export interface UpdateSportTypeMetricPayload {
  metricName?: string
  unit?: string
  isTimeBased?: boolean
  isDistanceBased?: boolean
  ordering?: number
}

export interface Sport {
  id: string
  name: string
  sportTypeId: string
  sportType: SportType
  seasonStart: string
  seasonEnd: string
  description: string | null
  coachId: string
  coach: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface SportDirectoryRow {
  id: string
  name: string
  sportType: { id: string; name: string }
  seasonStart: string
  seasonEnd: string
  coach: { id: string; firstName: string; lastName: string } | null
  rosterCount: number
}

export interface SportRosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  enrolledAt: string
}

export interface SportRoster {
  sport: Sport
  roster: SportRosterRow[]
}

export interface CreateSportPayload {
  name: string
  sportTypeId: string
  seasonStart: string
  seasonEnd: string
  description?: string
  coachId: string
}

export interface UpdateSportPayload {
  name?: string
  sportTypeId?: string
  seasonStart?: string
  seasonEnd?: string
  description?: string
  coachId?: string
}

export const MATCH_TYPES = ['friendly', 'inter_school', 'tournament', 'internal'] as const
export type MatchType = (typeof MATCH_TYPES)[number]

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  friendly: 'Friendly',
  inter_school: 'Inter-School',
  tournament: 'Tournament',
  internal: 'Internal',
}

export const TEAM_RESULTS = ['win', 'loss', 'draw', 'no_result'] as const
export type TeamResult = (typeof TEAM_RESULTS)[number]

export const TEAM_RESULT_LABELS: Record<TeamResult, string> = {
  win: 'Win',
  loss: 'Loss',
  draw: 'Draw',
  no_result: 'No Result',
}

export interface Match {
  id: string
  sportId: string
  date: string
  opponent: string | null
  venue: string
  matchType: MatchType
  teamResult: TeamResult
  teamScore: string | null
  notes: string | null
  loggedByStaffId: string
  loggedByStaff: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface CreateMatchPayload {
  date: string
  opponent?: string
  venue: string
  matchType: MatchType
  teamResult?: TeamResult
  teamScore?: string
  notes?: string
}

export interface UpdateMatchPayload {
  date?: string
  opponent?: string
  venue?: string
  matchType?: MatchType
  teamResult?: TeamResult
  teamScore?: string
  notes?: string
}

export type PerformanceStatus = 'draft' | 'submitted'

export interface SportMetric {
  id: string
  sportTypeId: string
  metricName: string
  unit: string | null
  isTimeBased: boolean
  isDistanceBased: boolean
  ordering: number
}

export interface PerformanceRosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  performanceId: string | null
  status: PerformanceStatus | null
  metricValues: Record<string, number>
  personalBests: Record<string, boolean>
  canEdit: boolean
}

export interface PerformanceEntryGridResponse {
  match: Match
  metrics: SportMetric[]
  roster: PerformanceRosterRow[]
}

export interface PerformanceEntryPayload {
  studentId: string
  metricValues: Record<string, number>
}

export interface BulkUpsertPerformancePayload {
  status: PerformanceStatus
  entries: PerformanceEntryPayload[]
}

export type TrendFlag = 'improving' | 'stable' | 'declining'

export const TREND_FLAG_LABELS: Record<TrendFlag, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
}

export type YearOnYearFlag = 'better' | 'worse' | 'similar'

export const YEAR_ON_YEAR_FLAG_LABELS: Record<YearOnYearFlag, string> = {
  better: 'Better than last year',
  worse: 'Worse than last year',
  similar: 'Similar to last year',
}

export interface SnapshotRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  metricName: string
  weekEnding: string
  rollingAvg: number | null
  trendFlag: TrendFlag
  seasonAvg: number | null
  personalBest: number | null
  lastSeasonAvg: number | null
  yearOnYearFlag: YearOnYearFlag | null
}

export interface SchoolDashboardTopPerformer {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  seasonAvg: number
}

export interface SchoolDashboardMetricTop {
  metricName: string
  topPerformers: SchoolDashboardTopPerformer[]
}

export interface SchoolDashboardSportRow {
  sportId: string
  sportName: string
  thisSeasonWinRate: number | null
  lastSeasonWinRate: number | null
  topPerformersByMetric: SchoolDashboardMetricTop[]
  yearOnYearDistribution: {
    better: number
    worse: number
    similar: number
    noData: number
  }
}

export interface TrainingSession {
  id: string
  sportId: string
  date: string
  description: string
  attendeeStudentIds: string[]
  sessionLeaderStudentId: string | null
  sessionLeaderStudent: { id: string; firstName: string; lastName: string } | null
  loggedByStaffId: string
  loggedByStaff: { id: string; firstName: string; lastName: string }
  createdAt: string
  updatedAt: string
}

export interface CreateTrainingSessionPayload {
  date: string
  description: string
  attendeeStudentIds: string[]
  sessionLeaderStudentId?: string
}

export interface UpdateTrainingSessionPayload {
  date?: string
  description?: string
  attendeeStudentIds?: string[]
  sessionLeaderStudentId?: string
}

// ─── Student/Guardian self-view (FR-P3-AV-05/06) ───────────────────────────────

/** Same fields as SnapshotRow minus the roster-display fields (firstName/lastName/
 * admissionNumber) — meaningless on a "my own data" self-view. */
export interface StudentMetricSnapshot {
  metricName: string
  weekEnding: string
  rollingAvg: number | null
  trendFlag: TrendFlag
  seasonAvg: number | null
  personalBest: number | null
  lastSeasonAvg: number | null
  yearOnYearFlag: YearOnYearFlag | null
}

export interface MatchHistoryRow {
  matchId: string
  date: string
  opponent: string | null
  venue: string
  matchType: MatchType
  teamResult: TeamResult
  metricValues: Record<string, number>
  personalBests: Record<string, boolean>
}

export interface StudentSportProfile {
  sport: Pick<Sport, 'id' | 'name' | 'sportType' | 'seasonStart' | 'seasonEnd'>
  matchHistory: MatchHistoryRow[]
  metricSnapshots: StudentMetricSnapshot[]
}

// ─── Public Sports Board (FR-P3-AV-07) ─────────────────────────────────────────

/** Literally just a name, in rank order — no seasonAvg/admissionNumber, matching the
 * "no individual detailed metrics" restriction on the public board. */
export interface PublicTopPerformer {
  firstName: string
  lastName: string
}

export interface PublicMetricTopPerformers {
  metricName: string
  topPerformers: PublicTopPerformer[]
}

export interface PublicMatchResult {
  matchId: string
  date: string
  opponent: string | null
  matchType: MatchType
  teamResult: TeamResult
  teamScore: string | null
}

export interface PublicSportsBoardRow {
  sportId: string
  sportName: string
  sportType: string
  matchResults: PublicMatchResult[]
  topPerformersByMetric: PublicMetricTopPerformers[]
}

// ─── Declining Performer Alert (FR-P3-PA-13) ───────────────────────────────────

export interface CoachAlert {
  id: string
  studentId: string
  firstName: string
  lastName: string
  sportId: string
  sportName: string
  metricName: string
  declineValues: number[]
  acknowledgedAt: string | null
  acknowledgedByStaffId: string | null
  createdAt: string
}
