export interface LabUtilisationRow {
  labId: string;
  labName: string;
  confirmedBookings: number;
  /** null when no dateFrom/dateTo is given — there is no meaningful denominator for an
   * unbounded range, so the rate is left uncomputed rather than divided by a made-up number. */
  totalAvailableSlots: number | null;
  utilisationRate: number | null;
}

export interface EquipmentHealthItemRef {
  id: string;
  name: string;
  labId: string;
  labName: string;
}

export interface LowStockItemRef extends EquipmentHealthItemRef {
  quantity: number;
  minStockLevel: number;
}

export interface RecentDamageReportRow {
  id: string;
  equipmentName: string;
  labId: string;
  labName: string;
  reportType: 'damaged' | 'missing';
  quantity: number;
  reportedAt: string;
}

export interface EquipmentHealthSummary {
  conditionCounts: { good: number; fair: number; poor: number };
  poorConditionItems: EquipmentHealthItemRef[];
  lowStockCount: number;
  lowStockItems: LowStockItemRef[];
  damageReportsByType: { damaged: number; missing: number };
  recentDamageReports: RecentDamageReportRow[];
}

export interface ExperimentCoverageRow {
  classSectionId: number;
  className: string;
  labId: string;
  labName: string;
  experimentCount: number;
}

export interface LabReportPerformanceRow {
  classSectionId: number;
  className: string;
  subjectId: string;
  subjectName: string;
  assignmentCount: number;
  averageGrade: number | null;
  submissionRate: number;
}

export interface LabOverviewDashboard {
  labUtilisation: LabUtilisationRow[];
  equipmentHealth: EquipmentHealthSummary;
  experimentCoverage: ExperimentCoverageRow[];
  labReportPerformance: LabReportPerformanceRow[];
}
