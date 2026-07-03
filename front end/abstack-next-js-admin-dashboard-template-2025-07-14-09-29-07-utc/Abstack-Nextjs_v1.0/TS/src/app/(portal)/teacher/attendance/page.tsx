'use client'
import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Save,
  UserCheck,
  XCircle,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyClassSections } from '@/features/attendance/hooks/useMyClassSections'
import { useDayAttendance } from '@/features/attendance/hooks/useDayAttendance'
import { useBulkMarkAttendance } from '@/features/attendance/hooks/useBulkMarkAttendance'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { AttendanceStatus, DayAttendanceRow, MyClassSection } from '@/features/attendance/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; outline: string; filled: string; textColor: string }
> = {
  present: {
    label: 'P',
    outline: 'btn-outline-success',
    filled: 'btn-success',
    textColor: '#15803d',
  },
  absent: {
    label: 'A',
    outline: 'btn-outline-danger',
    filled: 'btn-danger',
    textColor: '#dc2626',
  },
  late: {
    label: 'L',
    outline: 'btn-outline-warning',
    filled: 'btn-warning',
    textColor: '#d97706',
  },
  excused: {
    label: 'E',
    outline: 'btn-outline-info',
    filled: 'btn-info',
    textColor: '#0284c7',
  },
  medical: {
    label: 'M',
    outline: 'btn-outline-secondary',
    filled: 'btn-secondary',
    textColor: '#7c3aed',
  },
}

const ALL_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused', 'medical']

// ─── Day validation helper ────────────────────────────────────────────────────

function getDayInfo(date: string): { isWeekend: boolean; dayName: string } {
  const d = new Date(date + 'T00:00:00Z')
  const day = d.getUTCDay()
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return { isWeekend: day === 0 || day === 6, dayName: names[day] }
}

// ─── Day Status Banner ────────────────────────────────────────────────────────

function DayBanner({
  date,
  overrideReason,
  onOverrideChange,
  overrideRef,
}: {
  date: string
  overrideReason: string
  onOverrideChange: (v: string) => void
  overrideRef: React.RefObject<HTMLInputElement | null>
}) {
  const { isWeekend, dayName } = getDayInfo(date)
  const formatted = new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  if (!isWeekend) {
    return (
      <div
        className="d-flex align-items-center gap-3 rounded-3 px-4 py-3 mb-4"
        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
      >
        <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
        <span className="small fw-semibold" style={{ color: '#15803d' }}>
          Working day · {formatted}
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-3 px-4 py-3 mb-4"
      style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
        <span className="small fw-semibold" style={{ color: '#92400e' }}>
          {dayName} is a non-working day — override required to save attendance.
        </span>
      </div>
      <input
        ref={overrideRef}
        type="text"
        className="form-control form-control-sm"
        placeholder="Override reason (e.g. Special exam day)…"
        value={overrideReason}
        onChange={(e) => onOverrideChange(e.target.value)}
        maxLength={500}
        style={{ maxWidth: 480 }}
      />
    </div>
  )
}

// ─── Roster row ───────────────────────────────────────────────────────────────

function RosterRow({
  index,
  row,
  status,
  note,
  onStatusChange,
  onNoteChange,
}: {
  index: number
  row: DayAttendanceRow
  status: AttendanceStatus | null
  note: string
  onStatusChange: (studentId: string, s: AttendanceStatus) => void
  onNoteChange: (studentId: string, n: string) => void
}) {
  return (
    <tr style={{ verticalAlign: 'middle' }}>
      <td className="text-muted small ps-3">{index + 1}</td>
      <td>
        <div className="fw-semibold small">
          {row.lastName}, {row.firstName}
        </div>
        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
          {row.admissionNumber}
        </div>
      </td>
      <td>
        <div className="d-flex gap-1 flex-wrap">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const isSelected = status === s
            return (
              <button
                key={s}
                type="button"
                className={`btn btn-sm fw-bold ${isSelected ? cfg.filled : cfg.outline}`}
                style={{
                  minWidth: 36,
                  fontSize: '0.72rem',
                  ...(s === 'medical' && isSelected
                    ? { background: '#7c3aed', borderColor: '#7c3aed', color: '#fff' }
                    : s === 'medical' && !isSelected
                      ? { color: '#7c3aed', borderColor: '#7c3aed' }
                      : {}),
                }}
                onClick={() => onStatusChange(row.studentId, s)}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </td>
      <td>
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ minWidth: 140, fontSize: '0.8rem' }}
          placeholder="Note…"
          value={note}
          onChange={(e) => onNoteChange(row.studentId, e.target.value)}
          maxLength={200}
        />
      </td>
    </tr>
  )
}

// ─── Main page inner component ────────────────────────────────────────────────

function AttendancePage() {
  const { showNotification } = useNotificationContext()
  const overrideRef = useRef<HTMLInputElement>(null)

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [date, setDate] = useState(TODAY)
  const [localStatus, setLocalStatus] = useState<Record<string, AttendanceStatus | null>>({})
  const [localNote, setLocalNote] = useState<Record<string, string>>({})
  const [overrideReason, setOverrideReason] = useState('')

  const { data: sections = [], isLoading: sectionsLoading } = useMyClassSections()
  const { data: roster = [], isLoading: rosterLoading, dataUpdatedAt } = useDayAttendance(selectedSectionId, date)
  const bulkMark = useBulkMarkAttendance()

  // Auto-select first section
  useEffect(() => {
    if (sections.length > 0 && selectedSectionId === null) {
      setSelectedSectionId(sections[0].id)
    }
  }, [sections, selectedSectionId])

  // Sync local state when roster data actually changes (dataUpdatedAt is stable between renders)
  useEffect(() => {
    const statusMap: Record<string, AttendanceStatus | null> = {}
    const noteMap: Record<string, string> = {}
    roster.forEach((r) => {
      statusMap[r.studentId] = r.status
      noteMap[r.studentId] = r.note ?? ''
    })
    setLocalStatus(statusMap)
    setLocalNote(noteMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  // Reset override when date changes
  useEffect(() => {
    setOverrideReason('')
  }, [date])

  const { isWeekend } = getDayInfo(date)
  const saveBlocked = isWeekend && !overrideReason.trim()

  const markedCount = Object.values(localStatus).filter(Boolean).length
  const totalCount = roster.length

  const handleMarkAll = () => {
    const map: Record<string, AttendanceStatus> = {}
    roster.forEach((r) => { map[r.studentId] = 'present' })
    setLocalStatus(map)
  }

  const handleClearAll = () => {
    const map: Record<string, AttendanceStatus | null> = {}
    roster.forEach((r) => { map[r.studentId] = null })
    setLocalStatus(map)
  }

  const handleStatusChange = (studentId: string, s: AttendanceStatus) => {
    setLocalStatus((prev) => ({ ...prev, [studentId]: s }))
  }

  const handleNoteChange = (studentId: string, n: string) => {
    setLocalNote((prev) => ({ ...prev, [studentId]: n }))
  }

  const handleSave = () => {
    if (saveBlocked) {
      overrideRef.current?.focus()
      showNotification({
        variant: 'warning',
        message: 'This is a non-working day. Please enter an override reason before saving.',
      })
      return
    }

    const entries = roster
      .filter((r) => localStatus[r.studentId])
      .map((r) => ({
        studentId: r.studentId,
        status: localStatus[r.studentId]!,
        note: localNote[r.studentId] || undefined,
      }))

    if (entries.length === 0) {
      showNotification({ variant: 'warning', message: 'Mark at least one student before saving.' })
      return
    }

    bulkMark.mutate(
      {
        classSectionId: selectedSectionId!,
        date,
        defaultStatus: 'present',
        entries,
        overrideReason: overrideReason.trim() || undefined,
      },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: `${entries.length} attendance record${entries.length !== 1 ? 's' : ''} saved successfully.`,
          })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg =
            err?.response?.data?.message ?? err.message ?? 'Failed to save attendance.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const selectedSection = sections.find((s: MyClassSection) => s.id === selectedSectionId)

  return (
    <div className="container-fluid px-4 py-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="d-flex align-items-start justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              flexShrink: 0,
            }}
          >
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Daily Attendance</h4>
            <p className="text-muted small mb-0">
              {selectedSection
                ? `${selectedSection.grade.name} · Section ${selectedSection.name}`
                : 'Select a class section'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {sectionsLoading ? (
            <span className="placeholder col-4 rounded" style={{ height: 32, width: 160 }} />
          ) : (
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 200 }}
              value={selectedSectionId ?? ''}
              onChange={(e) => setSelectedSectionId(Number(e.target.value))}
            >
              {sections.length === 0 && (
                <option disabled value="">
                  No classes assigned
                </option>
              )}
              {sections.map((s: MyClassSection) => (
                <option key={s.id} value={s.id}>
                  {s.grade.name} · Section {s.name} ({s.academicYear})
                </option>
              ))}
            </select>
          )}

          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: 150 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setDate(TODAY)}
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Day banner ─────────────────────────────────────────────── */}
      <DayBanner
        date={date}
        overrideReason={overrideReason}
        onOverrideChange={setOverrideReason}
        overrideRef={overrideRef}
      />

      {/* ── Roster card ────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <UserCheck size={16} />
            Attendance Roster
          </span>
          <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>
            {markedCount} / {totalCount} marked
          </span>
        </div>

        <div className="card-body p-0">
          {/* Bulk actions */}
          <div
            className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
            style={{ background: '#f8fafc' }}
          >
            <button
              type="button"
              className="btn btn-sm btn-success d-flex align-items-center gap-1"
              onClick={handleMarkAll}
              disabled={roster.length === 0}
            >
              <CheckCircle2 size={14} />
              Mark All Present
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={handleClearAll}
              disabled={roster.length === 0}
            >
              <XCircle size={14} />
              Clear All
            </button>

            <div className="ms-auto d-flex gap-1 align-items-center small text-muted">
              <span
                className="badge rounded-pill"
                style={{ background: '#dcfce7', color: '#15803d' }}
              >
                P = Present
              </span>
              <span
                className="badge rounded-pill"
                style={{ background: '#fee2e2', color: '#dc2626' }}
              >
                A = Absent
              </span>
              <span
                className="badge rounded-pill"
                style={{ background: '#fef9c3', color: '#92400e' }}
              >
                L = Late
              </span>
              <span
                className="badge rounded-pill"
                style={{ background: '#e0f2fe', color: '#0284c7' }}
              >
                E = Excused
              </span>
              <span
                className="badge rounded-pill"
                style={{ background: '#ede9fe', color: '#7c3aed' }}
              >
                M = Medical
              </span>
            </div>
          </div>

          {/* Table */}
          {rosterLoading ? (
            <div className="p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 44 }} />
                </div>
              ))}
            </div>
          ) : roster.length === 0 ? (
            <div className="text-center text-muted py-5">
              <ClipboardList size={36} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No students found</p>
              <p className="small">
                {selectedSectionId
                  ? 'No active students are enrolled in this class section.'
                  : 'Select a class section to begin marking attendance.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle">
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th className="ps-3 fw-semibold text-muted small" style={{ width: 40 }}>
                      #
                    </th>
                    <th className="fw-semibold text-muted small">Student</th>
                    <th className="fw-semibold text-muted small">Status</th>
                    <th className="fw-semibold text-muted small" style={{ minWidth: 160 }}>
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((row, idx) => (
                    <RosterRow
                      key={row.studentId}
                      index={idx}
                      row={row}
                      status={localStatus[row.studentId] ?? null}
                      note={localNote[row.studentId] ?? ''}
                      onStatusChange={handleStatusChange}
                      onNoteChange={handleNoteChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer / Save */}
          {roster.length > 0 && (
            <div
              className="px-4 py-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{ background: '#f8fafc' }}
            >
              <span className="small text-muted">
                {markedCount} of {totalCount} students marked
              </span>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2 text-white fw-semibold px-4"
                style={{
                  background: saveBlocked
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  cursor: saveBlocked ? 'not-allowed' : 'pointer',
                }}
                onClick={handleSave}
                disabled={bulkMark.isPending}
              >
                <Save size={14} />
                {bulkMark.isPending ? 'Saving…' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export with role guard ────────────────────────────────────────────────────

export default function TeacherAttendance() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <AttendancePage />
    </RoleGuard>
  )
}
