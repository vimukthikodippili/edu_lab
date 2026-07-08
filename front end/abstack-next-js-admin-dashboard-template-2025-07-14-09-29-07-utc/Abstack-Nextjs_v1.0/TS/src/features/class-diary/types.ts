export interface ClassDiaryTimetableEntry {
  id: number
  academicYear: string
  classSectionId: number
  day: number
  period: number
  teacherId: string
  subjectId: string
  roomNumber: string | null
  classSection: { id: number; name: string }
  subject: { id: string; name: string; code: string }
}

export interface ClassDiaryEntryRecord {
  id: string
  timetableEntryId: number
  date: string
  notes: string | null
  attachmentFileIds: string[]
  attachments: { id: string; path: string }[]
}

export interface ClassDiarySlot {
  timetableEntry: ClassDiaryTimetableEntry
  diaryEntry: ClassDiaryEntryRecord | null
}

export interface UpsertClassDiaryEntryPayload {
  timetableEntryId: number
  date: string
  notes?: string
  attachmentFileIds?: string[]
}
