export interface FeeCategory {
  id: string
  name: string
  description?: string
  isOptional: boolean
}

export interface FeeStructure {
  id: string
  grade: number
  academicYear: string
  categories: {
    category: FeeCategory
    amount: number
    dueDate: string
    installments?: number
  }[]
}

export interface FeeInvoice {
  id: string
  studentId: string
  studentName: string
  grade: number
  academicYear: string
  items: {
    categoryId: string
    categoryName: string
    amount: number
    discount: number
    netAmount: number
  }[]
  totalAmount: number
  totalDiscount: number
  netAmount: number
  dueDate: string
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'waived'
  issuedAt: string
}

export interface FeePayment {
  id: string
  invoiceId: string
  amount: number
  method: 'cash' | 'bank_transfer' | 'online' | 'cheque'
  referenceNumber?: string
  paidAt: string
  recordedBy: string
}

export interface FeeDiscount {
  id: string
  studentId: string
  type: 'sibling' | 'merit' | 'financial_aid' | 'staff_ward' | 'custom'
  percentage?: number
  fixedAmount?: number
  reason: string
  approvedBy: string
  approvedAt: string
  validFrom: string
  validTo?: string
}
