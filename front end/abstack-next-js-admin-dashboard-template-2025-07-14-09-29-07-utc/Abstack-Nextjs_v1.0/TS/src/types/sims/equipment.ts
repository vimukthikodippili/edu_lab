export type EquipmentCondition = 'good' | 'fair' | 'poor'

export interface EquipmentCategory {
  id: string
  labTypeId: string
  labType: { id: string; name: string }
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreateEquipmentCategoryPayload {
  labTypeId: string
  name: string
}

export interface UpdateEquipmentCategoryPayload {
  labTypeId?: string
  name?: string
}

export interface Equipment {
  id: string
  labId: string
  name: string
  categoryId: string
  category: { id: string; name: string; labTypeId: string }
  quantity: number
  unit: string
  condition: EquipmentCondition
  serialNumber: string | null
  purchaseDate: string
  minStockLevel: number | null
  lowStockNotifiedAt: string | null
  lowStock: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEquipmentPayload {
  name: string
  categoryId: string
  quantity: number
  unit: string
  condition?: EquipmentCondition
  serialNumber?: string
  purchaseDate: string
  minStockLevel?: number
}

export interface UpdateEquipmentPayload {
  name?: string
  categoryId?: string
  quantity?: number
  unit?: string
  serialNumber?: string
  purchaseDate?: string
  minStockLevel?: number
}

export interface UpdateEquipmentConditionPayload {
  condition: EquipmentCondition
}

export interface WriteOffEquipmentPayload {
  quantity: number
  reason: string
}

export interface EquipmentConditionHistoryEntry {
  id: string
  equipmentId: string
  previousCondition: EquipmentCondition
  newCondition: EquipmentCondition
  changedById: string
  changedBy: { id: string; firstName: string; lastName: string }
  changedAt: string
}

export interface EquipmentReportRow {
  labName: string
  equipmentName: string
  category: string
  quantity: number
  unit: string
  condition: EquipmentCondition
  serialNumber: string
  purchaseDate: string
  minStockLevel: number | null
  lowStock: boolean
}

export interface EquipmentReportResponse {
  rows: EquipmentReportRow[]
  generatedAt: string
}
