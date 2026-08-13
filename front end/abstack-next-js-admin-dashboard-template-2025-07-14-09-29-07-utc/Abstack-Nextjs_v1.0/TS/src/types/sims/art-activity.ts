export const ART_PALETTE_COLORS = [
  'red',
  'blue',
  'yellow',
  'green',
  'orange',
  'purple',
  'black',
  'white',
  'brown',
  'pink',
] as const

export type ArtPaletteColor = (typeof ART_PALETTE_COLORS)[number]

export interface ArtActivity {
  id: string
  classSectionId: number
  activityDate: string
  title: string
  createdByStaffId: string
  createdAt: string
}

export interface ArtActivityRosterRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  hasAllColors: boolean | null
  colorsUsed: string[] | null
}

export interface ArtActivityRoster {
  activity: ArtActivity
  totalStudents: number
  preCheckConfirmedCount: number
  roster: ArtActivityRosterRow[]
}

export interface CreateArtActivityPayload {
  classSectionId: number
  activityDate: string
  title?: string
}

export interface BulkPreCheckPayload {
  activityId: string
  entries: { studentId: string; hasAllColors: boolean }[]
}

export interface BulkPostCheckPayload {
  activityId: string
  entries: { studentId: string; colorsUsed: string[] }[]
}
