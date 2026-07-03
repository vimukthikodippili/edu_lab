export interface FeeStructure {
  id: number
  gradeId: number
  termId: number
  feeCategory: string
  amount: number
  createdAt: string
  updatedAt: string
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue'

export interface Invoice {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  termId: number
  amount: number
  discountAmount: number
  payableAmount: number
  status: InvoiceStatus
  effectiveStatus: InvoiceStatus
  dueDate: string
}

export type FeeWaiverStatus = 'pending' | 'approved' | 'rejected'

export interface FeeWaiverRequest {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  invoiceId: string
  invoiceAmount: number
  invoiceDueDate: string
  requestedDiscountAmount: number
  reason: string
  status: FeeWaiverStatus
  requestedById: string
  decidedById: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
}

export interface GenerateInvoicesSummary {
  termId: number
  generatedCount: number
  skippedAlreadyExistsCount: number
  skippedNoFeeStructureCount: number
}
