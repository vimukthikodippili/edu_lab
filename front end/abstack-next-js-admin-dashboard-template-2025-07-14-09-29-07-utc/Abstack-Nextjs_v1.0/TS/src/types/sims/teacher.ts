export interface Subject {
  id: string
  name: string
  code: string
  grades: number[]
}

export interface Teacher {
  id: string
  staffId: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  nic: string
  address?: string
  photo?: string
  subjects: Subject[]
  roles: string[]
  hireDate: string
  status: 'active' | 'on_leave' | 'inactive'
  qualifications?: string[]
}

export interface LeaveRequest {
  id: string
  staffId: string
  leaveType: 'annual' | 'medical' | 'casual' | 'no_pay'
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  decidedById: string | null
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface PayrollRecord {
  id: string
  teacherId: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: 'draft' | 'processed' | 'paid'
}
