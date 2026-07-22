'use client'
import { useMemo, useState } from 'react'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useTeacherTimetable } from '@/features/timetable/hooks/useTeacherTimetable'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useClassSections } from '@/features/students/hooks/useClassSections'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useCreateLabBooking } from '../hooks/useCreateLabBooking'
import { useCreateRecurringLabBooking } from '../hooks/useCreateRecurringLabBooking'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { RecurringLabBookingResult } from '@/types/sims/labs'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CURRENT_YEAR = String(new Date().getFullYear())

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

interface LabBookingFormModalProps {
  labId: string
  onClose: () => void
}

export default function LabBookingFormModal({ labId, onClose }: LabBookingFormModalProps) {
  const { showNotification } = useNotificationContext()
  const { data: myStaff } = useMyStaff()
  const { data: myTimetable = [] } = useTeacherTimetable(myStaff?.id ?? null, CURRENT_YEAR)
  const { data: grades = [] } = useGrades()
  const { data: terms = [] } = useAcademicTerms()

  const createBooking = useCreateLabBooking(labId)
  const createRecurring = useCreateRecurringLabBooking(labId)

  const [linkToTimetable, setLinkToTimetable] = useState(myTimetable.length > 0)
  const [timetableEntryId, setTimetableEntryId] = useState<number | ''>('')

  const [gradeId, setGradeId] = useState<number | ''>('')
  const { data: classSections = [] } = useClassSections(gradeId === '' ? null : gradeId, CURRENT_YEAR)
  const { data: subjectsPage } = useSubjects({ limit: 100 })
  const subjects = subjectsPage?.data ?? []
  const [classSectionId, setClassSectionId] = useState<number | ''>('')
  const [subjectId, setSubjectId] = useState('')

  const [date, setDate] = useState('')
  const [periodNumber, setPeriodNumber] = useState(1)
  const [purpose, setPurpose] = useState('')

  const [isRecurring, setIsRecurring] = useState(false)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [termId, setTermId] = useState<number | ''>('')

  const [result, setResult] = useState<RecurringLabBookingResult | null>(null)

  const selectedEntry = useMemo(
    () => myTimetable.find((e) => e.id === timetableEntryId) ?? null,
    [myTimetable, timetableEntryId],
  )

  // Keep the effective class/subject/period in sync with the chosen timetable slot.
  const effectiveClassSectionId = linkToTimetable ? selectedEntry?.classSectionId ?? '' : classSectionId
  const effectiveSubjectId = linkToTimetable ? selectedEntry?.subjectId ?? '' : subjectId
  const effectivePeriod = linkToTimetable && selectedEntry ? selectedEntry.period : periodNumber
  const effectiveDayOfWeek = linkToTimetable && selectedEntry ? selectedEntry.day : dayOfWeek

  const dateMismatch = !isRecurring && linkToTimetable && selectedEntry && date && weekdayOf(date) !== selectedEntry.day

  const isValid = Boolean(
    effectiveClassSectionId &&
      effectiveSubjectId &&
      effectivePeriod > 0 &&
      (isRecurring ? termId !== '' : date && !dateMismatch),
  )

  const isPending = createBooking.isPending || createRecurring.isPending

  const handleSubmit = () => {
    if (!isValid) return

    if (isRecurring) {
      createRecurring.mutate(
        {
          classSectionId: effectiveClassSectionId as number,
          subjectId: effectiveSubjectId as string,
          dayOfWeek: effectiveDayOfWeek,
          periodNumber: effectivePeriod,
          termId: termId as number,
          timetableEntryId: linkToTimetable && selectedEntry ? selectedEntry.id : undefined,
          purpose: purpose.trim() || undefined,
        },
        {
          onSuccess: (data) => setResult(data),
          onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
        },
      )
      return
    }

    createBooking.mutate(
      {
        date,
        periodNumber: effectivePeriod,
        classSectionId: linkToTimetable ? undefined : (effectiveClassSectionId as number),
        subjectId: linkToTimetable ? undefined : (effectiveSubjectId as string),
        timetableEntryId: linkToTimetable && selectedEntry ? selectedEntry.id : undefined,
        purpose: purpose.trim() || undefined,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Lab booked.' })
          onClose()
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  if (result) {
    return (
      <>
        <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
        <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Recurring Booking Created</h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  <strong>{result.created.length}</strong> booking(s) created.
                </p>
                {result.skipped.length > 0 && (
                  <div className="alert alert-warning small mb-0">
                    <strong>{result.skipped.length} date(s) skipped</strong> — already booked:
                    <ul className="mb-0 mt-1">
                      {result.skipped.map((s) => (
                        <li key={s.date}>{s.date}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={onClose}>Done</button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Book This Lab</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="linkTimetable"
                  checked={linkToTimetable}
                  onChange={(e) => setLinkToTimetable(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="linkTimetable">
                  Link to my timetable slot
                </label>
              </div>

              {linkToTimetable ? (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">My Timetable Slot</label>
                  <select
                    className="form-select"
                    value={timetableEntryId}
                    onChange={(e) => setTimetableEntryId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select a slot…</option>
                    {myTimetable.map((e) => (
                      <option key={e.id} value={e.id}>
                        {DAY_NAMES[e.day]} P{e.period} — {e.classSection.name} — {e.subject.name}
                      </option>
                    ))}
                  </select>
                  {myTimetable.length === 0 && (
                    <div className="form-text">No timetable entries found for you this year.</div>
                  )}
                </div>
              ) : (
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold small">Grade</label>
                    <select
                      className="form-select"
                      value={gradeId}
                      onChange={(e) => { setGradeId(e.target.value ? Number(e.target.value) : ''); setClassSectionId('') }}
                    >
                      <option value="">Select grade…</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold small">Class Section</label>
                    <select
                      className="form-select"
                      value={classSectionId}
                      disabled={gradeId === ''}
                      onChange={(e) => setClassSectionId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">Select section…</option>
                      {classSections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Subject</label>
                    <select className="form-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                      <option value="">Select subject…</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <label className="form-check-label small fw-semibold" htmlFor="isRecurring">
                  Repeat weekly for the term
                </label>
              </div>

              {isRecurring ? (
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold small">Day of Week</label>
                    {linkToTimetable && selectedEntry ? (
                      <input className="form-control" disabled value={DAY_NAMES[selectedEntry.day]} />
                    ) : (
                      <select className="form-select" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6].map((d) => (
                          <option key={d} value={d}>{DAY_NAMES[d]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold small">Term</label>
                    <select className="form-select" value={termId} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">Select term…</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.startDate} – {t.endDate})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Date</label>
                  <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
                  {dateMismatch && (
                    <div className="form-text text-danger">
                      This date is not a {DAY_NAMES[selectedEntry!.day]} — it must match your timetable slot's day.
                    </div>
                  )}
                </div>
              )}

              {!linkToTimetable && (
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Period</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(Number(e.target.value))}
                  />
                </div>
              )}

              <div className="mb-1">
                <label className="form-label fw-semibold small">Purpose (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  maxLength={500}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : isRecurring ? 'Create Recurring Booking' : 'Book Lab'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
