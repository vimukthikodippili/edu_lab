export interface SubstituteCandidate {
  id: string
  firstName: string
  lastName: string
  isSubjectExpert: boolean
}

export interface SubstituteAssignment {
  id: string
  leaveRequestId: string
  academicYear: string
  day: number
  period: number
  absentTeacher: { id: string; firstName: string; lastName: string }
  classSection: { id: number; name: string }
  subject: { id: string; name: string }
  suggestedSubstitute: SubstituteCandidate | null
  assignedSubstitute: SubstituteCandidate | null
  candidates: SubstituteCandidate[]
  status: 'suggested' | 'assigned' | 'no_cover'
  assignedAt: string | null
  createdAt: string
}
