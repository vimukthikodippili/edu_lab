export interface CounselorNote {
  id: string
  studentId: string
  caseId: string | null
  counselorStaffId: string
  notes: string
  approvedSummary: string | null
  createdAt: string
}

export interface ApprovedSummary {
  id: string
  studentId: string
  approvedSummary: string
  createdAt: string
}
