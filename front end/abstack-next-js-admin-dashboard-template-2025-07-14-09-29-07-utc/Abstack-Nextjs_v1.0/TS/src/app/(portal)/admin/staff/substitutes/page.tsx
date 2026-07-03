'use client'
import React, { useState } from 'react'
import { Repeat2, CheckCircle, Star, UserX, Users } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSubstituteSuggestions } from '@/features/staff/hooks/useSubstituteSuggestions'
import { useAssignSubstitute } from '@/features/staff/hooks/useAssignSubstitute'
import type { SubstituteAssignment, SubstituteCandidate } from '@/types/sims/substitute'

const DAY_LABELS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type FilterTab = 'all' | 'suggested' | 'assigned'

const STATUS_MAP = {
  all: undefined,
  suggested: 'suggested',
  assigned: 'assigned',
} as const

function StatusBadge({ status }: { status: SubstituteAssignment['status'] }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    suggested: { bg: '#fef3c7', color: '#92400e', label: 'Pending Cover' },
    assigned:  { bg: '#dcfce7', color: '#15803d', label: 'Assigned' },
    no_cover:  { bg: '#fee2e2', color: '#dc2626', label: 'No Cover' },
  }
  const s = styles[status] ?? styles.no_cover
  return (
    <span
      className="badge rounded-pill"
      style={{ background: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }}
    >
      {s.label}
    </span>
  )
}

function ExpertBadge() {
  return (
    <span
      className="badge rounded-pill ms-1 d-inline-flex align-items-center gap-1"
      style={{ background: '#fef3c7', color: '#b45309', fontSize: '0.65rem' }}
    >
      <Star size={10} fill="#b45309" /> Expert
    </span>
  )
}

function AssignmentRow({ row, onAssign, isPending }: {
  row: SubstituteAssignment
  onAssign: (id: string, substituteStaffId: string) => void
  isPending: boolean
}) {
  const [selectedId, setSelectedId] = useState<string>('')

  const handleAccept = () => {
    if (!row.suggestedSubstitute) return
    if (!window.confirm(
      `Assign ${row.suggestedSubstitute.firstName} ${row.suggestedSubstitute.lastName} ` +
      `as substitute for ${row.classSection.name} — ${row.subject.name}?`
    )) return
    onAssign(row.id, row.suggestedSubstitute.id)
  }

  const handleManualSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedId(id)
    if (!id) return
    const candidate = row.candidates.find((c) => c.id === id)
    if (!candidate) return
    if (!window.confirm(
      `Assign ${candidate.firstName} ${candidate.lastName} ` +
      `as substitute for ${row.classSection.name} — ${row.subject.name}?`
    )) {
      setSelectedId('')
      return
    }
    onAssign(row.id, id)
  }

  return (
    <tr>
      <td className="fw-semibold">{DAY_LABELS[row.day] ?? `Day ${row.day}`}</td>
      <td>Period {row.period}</td>
      <td>{row.classSection.name}</td>
      <td>{row.subject.name}</td>
      <td>
        <span className="text-muted">
          {row.absentTeacher.firstName} {row.absentTeacher.lastName}
        </span>
      </td>
      <td>
        {row.suggestedSubstitute ? (
          <span>
            {row.suggestedSubstitute.firstName} {row.suggestedSubstitute.lastName}
            {row.suggestedSubstitute.isSubjectExpert && <ExpertBadge />}
          </span>
        ) : (
          <span className="text-muted fst-italic">No candidates</span>
        )}
      </td>
      <td>
        <StatusBadge status={row.status} />
      </td>
      <td>
        {row.status === 'assigned' ? (
          <span className="text-success fw-semibold small d-flex align-items-center gap-1">
            <CheckCircle size={14} />
            {row.assignedSubstitute
              ? `${row.assignedSubstitute.firstName} ${row.assignedSubstitute.lastName}`
              : 'Assigned'}
          </span>
        ) : (
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {row.suggestedSubstitute && (
              <button
                className="btn btn-sm btn-success d-flex align-items-center gap-1"
                style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                onClick={handleAccept}
                disabled={isPending}
              >
                <CheckCircle size={12} /> Assign
              </button>
            )}
            {row.candidates.length > 0 && (
              <select
                className="form-select form-select-sm"
                style={{ fontSize: '0.75rem', maxWidth: 180 }}
                value={selectedId}
                onChange={handleManualSelect}
                disabled={isPending}
              >
                <option value="">Override…</option>
                {row.candidates.map((c: SubstituteCandidate) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{c.isSubjectExpert ? ' ★' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

function SubstitutesContent() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const { showNotification } = useNotificationContext()
  const { data: assignments, isLoading, isError } = useSubstituteSuggestions(
    STATUS_MAP[activeTab]
  )
  const assign = useAssignSubstitute()

  const handleAssign = (id: string, substituteStaffId: string) => {
    assign.mutate(
      { id, substituteStaffId },
      {
        onSuccess: () =>
          showNotification({ variant: 'success', message: 'Substitute assigned successfully.' }),
        onError: (err: Error) =>
          showNotification({
            variant: 'danger',
            message: (err as any)?.response?.data?.message ?? 'Failed to assign substitute.',
          }),
      }
    )
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'suggested', label: 'Pending Cover' },
    { key: 'assigned', label: 'Assigned' },
  ]

  return (
    <div className="container-fluid">
      {/* Header Card */}
      <div
        className="card shadow-sm rounded-4 mb-4 border-0 text-white"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
      >
        <div className="card-body py-4 px-4 d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.2)' }}
          >
            <Repeat2 size={26} color="#fff" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Substitute Cover</h4>
            <p className="mb-0 opacity-75 small">
              Review and assign substitute teachers for approved leave slots
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm rounded-pill px-3 ${
              activeTab === t.key ? 'btn-warning text-dark fw-semibold' : 'btn-outline-secondary'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="card shadow-sm rounded-4 border-0">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-3">
                  <span className="placeholder col-12 rounded" style={{ height: 44 }} />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-5 text-danger">
              <p>Failed to load substitute assignments. Please refresh.</p>
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 72, height: 72, background: '#fef3c7' }}
              >
                <Users size={32} color="#d97706" />
              </div>
              <h6 className="text-muted">No substitute assignments yet</h6>
              <p className="text-muted small mb-0">
                They appear automatically when teacher leave is approved.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead style={{ background: '#fafafa' }}>
                  <tr>
                    <th className="ps-4 text-muted fw-semibold">Day</th>
                    <th className="text-muted fw-semibold">Period</th>
                    <th className="text-muted fw-semibold">Class</th>
                    <th className="text-muted fw-semibold">Subject</th>
                    <th className="text-muted fw-semibold">Absent Teacher</th>
                    <th className="text-muted fw-semibold">Suggested Substitute</th>
                    <th className="text-muted fw-semibold">Status</th>
                    <th className="text-muted fw-semibold pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => (
                    <AssignmentRow
                      key={row.id}
                      row={row}
                      onAssign={handleAssign}
                      isPending={assign.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-muted small mt-2 text-end">Auto-refreshes every 30 s</p>
    </div>
  )
}

export default function SubstitutesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <SubstitutesContent />
    </RoleGuard>
  )
}
