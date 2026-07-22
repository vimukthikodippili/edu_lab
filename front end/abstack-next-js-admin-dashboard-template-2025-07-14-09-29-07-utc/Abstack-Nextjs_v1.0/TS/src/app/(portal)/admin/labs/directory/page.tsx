'use client'
import Link from 'next/link'
import { ListChecks, ArrowLeft, Users, CalendarClock, Package, AlertTriangle, FlaskConical } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLabsDirectory } from '@/features/labs/hooks/useLabsDirectory'
import type { LabAvailabilityStatus } from '@/types/sims/labs'

const STATUS_STYLE: Record<LabAvailabilityStatus, { bg: string; text: string; label: string }> = {
  available: { bg: '#dcfce7', text: '#15803d', label: 'Available' },
  booked: { bg: '#fef3c7', text: '#b45309', label: 'Booked' },
  maintenance: { bg: '#fee2e2', text: '#dc2626', label: 'Maintenance' },
}

function AvailabilityBadge({ status }: { status: LabAvailabilityStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <span
      className="badge rounded-pill fw-semibold"
      style={{ background: style.bg, color: style.text, fontSize: '0.75rem', padding: '0.4em 0.8em' }}
    >
      {style.label}
    </span>
  )
}

function LabDirectoryContent() {
  const { data: labs, isLoading, isFetching } = useLabsDirectory()

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
          >
            <ListChecks size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">
              Lab Directory
              {isFetching && !isLoading && <span className="spinner-border spinner-border-sm ms-2 text-muted" />}
            </h4>
            <p className="text-muted small mb-0">Every registered lab, with its live availability right now</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/labs/experiment-logs" className="btn btn-outline-success btn-sm">
            <FlaskConical size={14} className="me-1" /> Experiment Logs
          </Link>
          <Link href="/admin/labs/damage-reports" className="btn btn-outline-danger btn-sm">
            <AlertTriangle size={14} className="me-1" /> Damage Reports
          </Link>
          <Link href="/admin/labs" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" /> Back to Lab Setup
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 64 }} />
          ))}
        </div>
      )}

      {!isLoading && (labs?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">No labs registered yet.</div>
        </div>
      )}

      <div className="row g-3">
        {(labs ?? []).map((lab) => (
          <div key={lab.id} className="col-12 col-md-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <div className="fw-semibold">{lab.name}</div>
                    <div className="small text-muted">{lab.labType.name} · Room {lab.roomNumber}</div>
                  </div>
                  <AvailabilityBadge status={lab.availabilityStatus} />
                </div>
                <div className="small text-muted d-flex align-items-center gap-1 mb-1">
                  <Users size={13} /> Capacity {lab.capacity}
                </div>
                <div className="small text-muted mb-2">
                  Lab In-Charge: {lab.labInCharge.firstName} {lab.labInCharge.lastName}
                </div>
                <div className="d-flex gap-2">
                  <Link href={`/admin/labs/${lab.id}/timetable`} className="btn btn-outline-secondary btn-sm">
                    <CalendarClock size={13} className="me-1" /> Weekly Timetable
                  </Link>
                  <Link href={`/admin/labs/${lab.id}/equipment`} className="btn btn-outline-secondary btn-sm">
                    <Package size={13} className="me-1" /> Equipment
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LabDirectoryPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <LabDirectoryContent />
    </RoleGuard>
  )
}
