export type DamageReportType = 'damaged' | 'missing'

export interface SessionEquipmentUsage {
  id: string
  labBookingId: string
  equipmentId: string
  equipment: { id: string; name: string; unit: string }
  quantityUsed: number
  submittedById: string
  submittedBy: { id: string; firstName: string; lastName: string }
  submittedAt: string
}

export interface EquipmentDamageReport {
  id: string
  labBookingId: string
  equipmentId: string
  equipment: { id: string; name: string; unit: string }
  reportType: DamageReportType
  quantity: number
  responsibleStudentId: string | null
  responsibleStudent: { id: string; firstName: string; lastName: string; admissionNumber?: string } | null
  notes: string | null
  reportedById: string
  reportedBy: { id: string; firstName: string; lastName: string }
  reportedAt: string
}

export interface DamageReportRow extends EquipmentDamageReport {
  labId: string | null
  labName: string
  sessionDate: string | null
}

export interface SessionReportResult {
  usage: SessionEquipmentUsage[]
  damage: EquipmentDamageReport[]
}

export interface SubmitSessionUsageItem {
  equipmentId: string
  quantityUsed: number
}

export interface SubmitDamageReportItem {
  equipmentId: string
  reportType: DamageReportType
  quantity: number
  responsibleStudentId?: string
  notes?: string
}

export interface SubmitSessionReportPayload {
  usage?: SubmitSessionUsageItem[]
  damage?: SubmitDamageReportItem[]
}

export interface GetDamageReportsFilters {
  labId?: string
  dateFrom?: string
  dateTo?: string
  reportType?: DamageReportType
}
