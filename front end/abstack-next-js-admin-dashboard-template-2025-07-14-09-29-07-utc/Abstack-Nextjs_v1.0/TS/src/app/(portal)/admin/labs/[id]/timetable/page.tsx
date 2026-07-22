'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronLeft, ChevronRight, ArrowLeft, Plus, Package } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useLabBookings } from '@/features/labs/hooks/useLabBookings'
import LabWeeklyTimetableGrid from '@/features/labs/components/LabWeeklyTimetableGrid'
import LabBookingFormModal from '@/features/labs/components/LabBookingFormModal'

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function LabTimetableContent({ labId }: { labId: string }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [showBookingModal, setShowBookingModal] = useState(false)

  const { data: labs } = useLabs()
  const lab = labs?.find((l) => l.id === labId)
  const { data: bookings = [], isLoading } = useLabBookings(labId, weekStart)

  const weekEnd = addDays(weekStart, 5)

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}
          >
            <CalendarClock size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">{lab ? `${lab.name} — Weekly Timetable` : 'Lab Weekly Timetable'}</h4>
            <p className="text-muted small mb-0">{weekStart} – {weekEnd}</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/admin/labs/directory" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" /> Back to Directory
          </Link>
          <Link href={`/admin/labs/${labId}/equipment`} className="btn btn-outline-secondary btn-sm">
            <Package size={14} className="me-1" /> Equipment
          </Link>
          <button type="button" className="btn btn-sm text-white" style={{ background: '#06b6d4' }} onClick={() => setShowBookingModal(true)}>
            <Plus size={14} className="me-1" /> Book This Lab
          </button>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
          <ChevronLeft size={14} />
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setWeekStart(mondayOf(new Date()))}>
          This Week
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <LabWeeklyTimetableGrid labId={labId} bookings={bookings} isLoading={isLoading} />
        </div>
      </div>

      {showBookingModal && <LabBookingFormModal labId={labId} onClose={() => setShowBookingModal(false)} />}
    </div>
  )
}

export default function LabTimetablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <LabTimetableContent labId={id} />
    </RoleGuard>
  )
}
