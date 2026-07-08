'use client'
import { useState, useEffect } from 'react'
import { Search, Users, Activity } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useStaffPerformance } from '@/features/teacher-performance/hooks/useStaffPerformance'
import TeacherPerformanceCharts from '@/features/teacher-performance/components/TeacherPerformanceCharts'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

function TeacherPicker({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string, name: string) => void }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { data, isLoading } = useStaff({ search: debouncedSearch, limit: 10 })

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body py-3">
        <label className="form-label fw-semibold small mb-1">Find a teacher</label>
        <div className="input-group input-group-sm mb-2">
          <span className="input-group-text bg-white border-end-0">
            <Search size={14} className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Search by name, designation, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && debouncedSearch && (
          <p className="text-muted small mb-0">Searching…</p>
        )}

        {!isLoading && debouncedSearch && (data?.data.length ?? 0) === 0 && (
          <p className="text-muted small mb-0">No staff match that search.</p>
        )}

        {!!data?.data.length && (
          <div className="list-group list-group-flush" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {data.data.map((staff) => (
              <button
                key={staff.id}
                type="button"
                className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${selectedId === staff.id ? 'active' : ''}`}
                onClick={() => onSelect(staff.id, `${staff.firstName} ${staff.lastName}`)}
              >
                <span className="small">{staff.firstName} {staff.lastName}</span>
                <span className={`small ${selectedId === staff.id ? 'text-white-50' : 'text-muted'}`}>
                  {staff.designation}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PerformanceView({ staffId }: { staffId: string }) {
  const { data, isLoading } = useStaffPerformance(staffId)

  if (isLoading) {
    return (
      <div className="placeholder-glow">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="placeholder col-3 mb-3 rounded" style={{ height: 20 }} />
              <div className="placeholder col-12 rounded" style={{ height: 200 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      <div className="d-flex align-items-center gap-2 mb-3">
        <h5 className="mb-0 fw-bold">{data.teacher.firstName} {data.teacher.lastName}</h5>
      </div>
      <TeacherPerformanceCharts data={data} behindScheduleOutlier={data.behindScheduleOutlier} />
    </>
  )
}

function TeacherPerformanceLookup() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <Activity size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Teacher Performance</h4>
          <p className="text-muted small mb-0">
            Review any teacher&rsquo;s attendance, class results, and syllabus pace — data and trends, not a rating
          </p>
        </div>
      </div>

      <TeacherPicker selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />

      {!selectedId ? (
        <div className="py-5 text-center text-muted">
          <Users size={40} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">Search for a teacher above to view their dashboard</p>
        </div>
      ) : (
        <PerformanceView key={selectedId} staffId={selectedId} />
      )}
    </div>
  )
}

export default function PrincipalTeacherPerformancePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <TeacherPerformanceLookup />
    </RoleGuard>
  )
}
