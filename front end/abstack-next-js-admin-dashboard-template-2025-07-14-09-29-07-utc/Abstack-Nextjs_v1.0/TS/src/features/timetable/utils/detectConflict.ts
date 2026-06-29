import type { TimetableEntry } from '../types'

export type ConflictType = 'class_slot_occupied'

export interface ConflictInfo {
  type: ConflictType
  message: string
  conflictingEntry: TimetableEntry
}

/**
 * Checks whether moving a timetable entry to (targetDay, targetPeriod) creates
 * a same-class slot conflict within the currently loaded entry set.
 * Cross-class teacher conflicts are enforced server-side (HTTP 409).
 */
export function detectConflict(
  entries: TimetableEntry[],
  movingId: number,
  targetDay: number,
  targetPeriod: number,
): ConflictInfo | null {
  const moving = entries.find((e) => e.id === movingId)
  if (moving && moving.day === targetDay && moving.period === targetPeriod) return null

  const occupant = entries.find(
    (e) => e.id !== movingId && e.day === targetDay && e.period === targetPeriod,
  )
  if (occupant) {
    return {
      type: 'class_slot_occupied',
      message: `Slot ${targetDay > 5 ? 'Sat' : ['Mon','Tue','Wed','Thu','Fri'][targetDay - 1]} P${targetPeriod} is occupied by ${occupant.subject.code} — ${occupant.teacher.firstName} ${occupant.teacher.lastName}. Move that entry first.`,
      conflictingEntry: occupant,
    }
  }

  return null
}
