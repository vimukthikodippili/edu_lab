export class PrincipalKpiResponse {
  attendanceRate: number;
  attendanceHasData: boolean;
  feeCollectionRate: number;
  pendingApprovals: number;
  activeAlerts: number;
  // FR-MHA-34/AC #92 — count of distinct students whose latest completed MHA session has at
  // least one risk category at High or Severe. Non-diagnostic: a number only, never a category
  // or disorder name (AC #93).
  wellbeingConcernCount: number;
  // FR-MHA-34/AC #95 — count of students with an unresolved (open) MHA safety flag case.
  safetyAlertCount: number;
}
