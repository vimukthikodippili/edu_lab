export interface TimetableEntry {
  id: number
  academicYear: string
  classSectionId: number
  day: number   // 1=Mon, 2=Tue, ..., 6=Sat
  period: number
  teacherId: string
  subjectId: string
  roomNumber: string | null
  status: 'draft' | 'confirmed' | 'published'
  generatedAt: string
  classSection: {
    id: number
    name: string
    academicYear: string
    grade: { id: number; level: number; name: string; stage: string }
  }
  teacher: { id: string; firstName: string; lastName: string; employeeNumber: string }
  subject: { id: string; code: string; name: string; category: { id: number; name: string } }
}

export interface RoomConflictWarning {
  day: number
  period: number
  roomNumber: string
  conflictingEntry: {
    classSection: { id: number; name: string }
    subject: { id: string; name: string }
    teacher: { id: string; name: string }
  }
}

export interface UpdatedTimetableEntry extends TimetableEntry {
  roomConflict: RoomConflictWarning | null
}

export interface ConflictRecord {
  classSection: { id: number; gradeName: string; name: string }
  teacher: { id: string; name: string }
  subject: { id: string; code: string; name: string }
  requested: number
  assigned: number
  unassigned: number
}

export interface GenerationResult {
  academicYear: string
  entriesCreated: number
  conflictsCount: number
  durationMs: number
  conflicts: ConflictRecord[]
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}
