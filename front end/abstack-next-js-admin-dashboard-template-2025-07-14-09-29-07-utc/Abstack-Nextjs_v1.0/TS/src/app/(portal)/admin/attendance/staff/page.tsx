'use client'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { UserCheck, Users, TrendingUp } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { useStaffDayAttendance, type StaffDayAttendanceRow } from '@/features/attendance/hooks/useStaffDayAttendance'
import { useMarkStaffAttendance } from '@/features/attendance/hooks/useMarkStaffAttendance'
import { useStaffAttendanceTrend, type AttendanceTrendGranularity } from '@/features/attendance/hooks/useStaffAttendanceTrend'
import type { StaffAttendanceStatus } from '@/features/attendance/hooks/useMyStaffAttendanceToday'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

const STATUS_BADGE: Record<StaffAttendanceStatus, { label: string; bg: string; color: string }> = {
  present: { label: 'Present', bg: '#dcfce7', color: '#15803d' },
  late: { label: 'Late', bg: '#fef9c3', color: '#92400e' },
  half_day: { label: 'Half Day', bg: '#e0f2fe', color: '#0284c7' },
  on_leave: { label: 'On Leave', bg: '#ede9fe', color: '#7c3aed' },
  absent: { label: 'Absent', bg: '#fee2e2', color: '#dc2626' },
}
const NOT_MARKED_BADGE = { label: 'Not Marked', bg: '#f1f5f9', color: '#64748b' }
const STATUS_OPTIONS: { value: StaffAttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'absent', label: 'Absent' },
]

function StatusSelect({
  staffId,
  status,
  onChange,
  disabled,
}: {
  staffId: string
  status: StaffAttendanceStatus | null
  onChange: (staffId: string, status: StaffAttendanceStatus) => void
  disabled: boolean
}) {
  const badge = status ? STATUS_BADGE[status] : NOT_MARKED_BADGE
  return (
    <select
      className="form-select form-select-sm fw-semibold border-0"
      style={{ background: badge.bg, color: badge.color, fontSize: '0.75rem', maxWidth: 140 }}
      value={status ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(staffId, e.target.value as StaffAttendanceStatus)}
    >
      <option value="" disabled>
        Not Marked
      </option>
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="card border-0 shadow-sm h-100" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="card-body py-3">
        <div className="fw-bold mb-1" style={{ fontSize: '1.5rem', color: accent }}>{value}</div>
        <div className="text-muted small">{label}</div>
      </div>
    </div>
  )
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultRangeFor(granularity: AttendanceTrendGranularity): { from: string; to: string } {
  const now = new Date()
  if (granularity === 'day') {
    const from = new Date(now)
    from.setUTCDate(from.getUTCDate() - 29)
    return { from: dateStr(from), to: todayStr() }
  }
  if (granularity === 'month') {
    return { from: `${now.getUTCFullYear()}-01-01`, to: `${now.getUTCFullYear()}-12-31` }
  }
  return { from: `${now.getUTCFullYear() - 2}-01-01`, to: `${now.getUTCFullYear()}-12-31` }
}

function formatBucketLabel(bucket: string, granularity: AttendanceTrendGranularity): string {
  if (granularity === 'year') return bucket
  if (granularity === 'month') {
    const [y, m] = bucket.split('-')
    return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }
  return new Date(`${bucket}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function AttendanceTrendPanel() {
  const [granularity, setGranularity] = useState<AttendanceTrendGranularity>('day')
  const { from, to } = useMemo(() => defaultRangeFor(granularity), [granularity])
  const { data: buckets = [], isLoading } = useStaffAttendanceTrend(granularity, from, to)

  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-header border-0 py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ background: '#f8fafc' }}>
        <div className="d-flex align-items-center gap-2">
          <TrendingUp size={16} className="text-muted" />
          <span className="fw-semibold small">Whole-School Attendance Trend</span>
        </div>
        <div className="btn-group btn-group-sm" role="group">
          {(['day', 'month', 'year'] as AttendanceTrendGranularity[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`btn ${granularity === g ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setGranularity(g)}
            >
              {g === 'day' ? 'Day' : g === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="placeholder-glow">
            <span className="placeholder col-12 d-block" style={{ height: 260 }} />
          </div>
        ) : buckets.length === 0 ? (
          <div className="text-center text-muted py-5">
            <TrendingUp size={32} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No attendance data in this range yet</p>
            <p className="small mb-0">Mark some attendance below to see the trend build up.</p>
          </div>
        ) : (
          <Chart
            type="line"
            height={280}
            series={[{ name: 'Attendance Rate %', data: buckets.map((b) => b.rate) }]}
            options={{
              chart: { toolbar: { show: false } },
              xaxis: { categories: buckets.map((b) => formatBucketLabel(b.bucket, granularity)) },
              yaxis: { min: 0, max: 100, title: { text: 'Attendance Rate %' } },
              stroke: { curve: 'smooth', width: 3 },
              colors: ['#6366f1'],
              markers: { size: 4 },
              dataLabels: { enabled: false },
              tooltip: {
                y: {
                  formatter: (val: number, opts: { dataPointIndex: number }) => {
                    const b = buckets[opts.dataPointIndex]
                    return `${val}% (${b.presentLikeCount}/${b.totalCount})`
                  },
                },
              },
            }}
          />
        )}
      </div>
    </div>
  )
}

function StaffAttendanceAuditContent() {
  const [date, setDate] = useState(todayStr())
  const { data: rows, isLoading, isError } = useStaffDayAttendance(date)
  const markAttendance = useMarkStaffAttendance()
  const [savingStaffId, setSavingStaffId] = useState<string | null>(null)

  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    setSavingStaffId(staffId)
    markAttendance.mutate(
      { staffId, date, status },
      { onSettled: () => setSavingStaffId(null) },
    )
  }

  const total = rows?.length ?? 0
  const presentLike = (rows ?? []).filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'half_day').length
  const notMarked = (rows ?? []).filter((r) => r.status === null).length
  const rate = total > 0 ? Math.round((presentLike / total) * 100) : 0
  const rateColor = rate < 75 ? '#dc2626' : rate < 90 ? '#d97706' : '#15803d'

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={UserCheck}
        title="Staff Attendance Audit"
        subtitle="Who has checked in today, across every active staff member"
      />

      {/* Date filter */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {isError && (
        <div className="alert alert-danger py-2 small">Failed to load staff attendance. Please try again.</div>
      )}

      {isLoading ? (
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm placeholder-glow">
                <div className="card-body py-3">
                  <span className="placeholder col-6 d-block mb-2" style={{ height: 28 }} />
                  <span className="placeholder col-8 d-block" style={{ height: 14 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <SummaryCard label="Total Active Staff" value={total} accent="#667eea" />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard label="Present / Checked In" value={presentLike} accent="#15803d" />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard label="Not Marked" value={notMarked} accent={notMarked > 0 ? '#d97706' : '#94a3b8'} />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard label="Attendance Rate" value={`${rate}%`} accent={rateColor} />
            </div>
          </div>

          {/* Roster table */}
          <div className="card border-0 shadow-sm">
            <div
              className="card-header border-0 py-3 px-4 d-flex align-items-center gap-2"
              style={{ background: '#f8fafc' }}
            >
              <Users size={16} className="text-muted" />
              <span className="fw-semibold small">{total} active staff · {date}</span>
            </div>

            {(rows ?? []).length === 0 ? (
              <div className="card-body text-center text-muted py-5">
                <UserCheck size={36} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No active staff found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0 align-middle">
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th className="ps-3 fw-semibold text-muted small" style={{ width: 40 }}>#</th>
                      <th className="fw-semibold text-muted small">Staff</th>
                      <th className="fw-semibold text-muted small">Employee No.</th>
                      <th className="fw-semibold text-muted small">Designation</th>
                      <th className="fw-semibold text-muted small">Department</th>
                      <th className="fw-semibold text-muted small text-center">Status</th>
                      <th className="fw-semibold text-muted small text-end pe-3">Marked At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows ?? []).map((row: StaffDayAttendanceRow, i: number) => (
                      <tr key={row.staffId} style={{ verticalAlign: 'middle' }}>
                        <td className="text-muted small ps-3">{i + 1}</td>
                        <td>
                          <span className="fw-semibold small">{row.firstName} {row.lastName}</span>
                        </td>
                        <td className="text-muted small">{row.employeeNumber}</td>
                        <td className="text-muted small">{row.designation}</td>
                        <td className="text-muted small">{row.department}</td>
                        <td className="text-center">
                          <StatusSelect
                            staffId={row.staffId}
                            status={row.status}
                            onChange={handleStatusChange}
                            disabled={savingStaffId === row.staffId}
                          />
                        </td>
                        <td className="text-muted small text-end pe-3">
                          {row.markedAt ? new Date(row.markedAt).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-muted mt-2" style={{ fontSize: '0.7rem' }}>
            Attendance Rate = (Present + Late + Half Day) ÷ Total Active Staff × 100, for the selected date. Change the Status dropdown on any row to mark or correct that staff member's attendance.
          </p>

          <AttendanceTrendPanel />
        </>
      )}
    </div>
  )
}

export default function StaffAttendanceAuditPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <StaffAttendanceAuditContent />
    </RoleGuard>
  )
}
