import { detectConflict } from './detectConflict'
import type { TimetableEntry } from '../types'

const makeEntry = (overrides: Partial<TimetableEntry> & Pick<TimetableEntry, 'id' | 'day' | 'period'>): TimetableEntry => ({
  academicYear: '2026',
  classSectionId: 1,
  teacherId: 'teacher-uuid',
  subjectId: 'subject-uuid',
  roomNumber: null,
  generatedAt: '2026-01-01T00:00:00Z',
  classSection: { id: 1, name: 'A', academicYear: '2026', grade: { id: 1, level: 1, name: 'Grade 1', stage: 'primary' } },
  teacher: { id: 'teacher-uuid', firstName: 'Nimal', lastName: 'Perera', employeeNumber: 'T001' },
  subject: { id: 'subject-uuid', code: 'MATH', name: 'Mathematics', category: { id: 1, name: 'mathematics' } },
  ...overrides,
})

const entries: TimetableEntry[] = [
  makeEntry({ id: 1, day: 1, period: 1 }),
  makeEntry({ id: 2, day: 1, period: 2, subjectId: 'sci', subject: { id: 'sci', code: 'SCI', name: 'Science', category: { id: 2, name: 'science' } } }),
  makeEntry({ id: 3, day: 2, period: 1 }),
]

describe('detectConflict', () => {
  it('returns ConflictInfo when the target slot is already occupied by a different entry', () => {
    // Entry 1 is at day=1, period=1. Trying to move entry 3 there.
    const result = detectConflict(entries, 3, 1, 1)
    expect(result).not.toBeNull()
    expect(result?.type).toBe('class_slot_occupied')
    expect(result?.conflictingEntry.id).toBe(1)
    expect(result?.message).toContain('MATH')
  })

  it('returns null when the target slot is empty', () => {
    // day=3, period=5 has no entry
    const result = detectConflict(entries, 1, 3, 5)
    expect(result).toBeNull()
  })

  it('returns null when dropping onto the same slot the entry currently occupies', () => {
    // Entry 1 is already at day=1, period=1 — no-op move
    const result = detectConflict(entries, 1, 1, 1)
    expect(result).toBeNull()
  })
})
