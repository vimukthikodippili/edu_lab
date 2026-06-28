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
  teacherId: string
  teacherName: string
  type: 'sick' | 'annual' | 'casual' | 'maternity' | 'no_pay'
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  substituteTeacherId?: string
  createdAt: string
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
