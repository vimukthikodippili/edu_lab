'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  UserPlus,
  Settings,
  BookOpen,
  TrendingUp,
  FlaskConical,
  History,
} from 'lucide-react'
import { usePrincipalKpi } from '@/features/principal/hooks/usePrincipalKpi'
import { useStaff } from '@/features/staff'
import { useStudents } from '@/features/students'
import { useRecentActivity } from '@/features/admin/hooks/useRecentActivity'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

interface StatCard {
  label: string
  sub: string
  value: string | number
  icon: React.ElementType
  color: string
  href: string
}

interface QuickAction {
  label: string
  icon: React.ElementType
  href: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Enroll Student', icon: UserPlus, href: '/admin/students/enroll' },
  { label: 'Register Staff', icon: UserCheck, href: '/admin/staff/register' },
  { label: 'Annual Promotion', icon: TrendingUp, href: '/admin/students/promote' },
  { label: 'Approvals Queue', icon: ClipboardList, href: '/principal/approvals' },
  { label: 'Academic Setup', icon: BookOpen, href: '/admin/subjects' },
  { label: 'Lab Setup', icon: FlaskConical, href: '/admin/labs' },
  { label: 'School Settings', icon: Settings, href: '/admin/settings' },
]

// Green/amber/red bands for a percentage KPI — same thresholds used on the Principal Dashboard.
function rateColor(rate: number): string {
  if (rate >= 90) return '#10b981'
  if (rate >= 75) return '#f59e0b'
  return '#ef4444'
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Coarse action -> color mapping for the activity feed — most AuditAction values are one of
// these three shapes (approve-like, reject-like, or a neutral create/update-style action).
function actionStyle(action: string): { bg: string; color: string } {
  if (/reject|cancel|block|abandon|revoke/.test(action)) return { bg: '#fee2e2', color: '#dc2626' }
  if (/approve|complete|publish|record|generate/.test(action)) return { bg: '#dcfce7', color: '#15803d' }
  return { bg: '#dbeafe', color: '#1d4ed8' }
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function buildStats(kpi: {
  attendanceHasData: boolean
  attendanceRate: number
  feeCollectionRate: number
  pendingApprovals: number
}, staffTotal: number | undefined, studentTotal: number | undefined): StatCard[] {
  return [
    {
      label: 'Total Staff',
      value: staffTotal ?? '—',
      sub: 'active staff accounts',
      icon: Users,
      color: '#8b5cf6',
      href: '/admin/staff',
    },
    {
      label: 'Total Students',
      value: studentTotal ?? '—',
      sub: 'currently active',
      icon: GraduationCap,
      color: '#0891b2',
      href: '/admin/students',
    },
    {
      label: 'Attendance Today',
      value: kpi.attendanceHasData ? `${kpi.attendanceRate}%` : 'N/A',
      sub: kpi.attendanceHasData ? 'of students present today' : 'Not yet marked today',
      icon: UserCheck,
      color: kpi.attendanceHasData ? rateColor(kpi.attendanceRate) : '#94a3b8',
      href: '/admin/attendance/reports',
    },
    {
      label: 'Fee Collection',
      value: `${kpi.feeCollectionRate}%`,
      sub: 'of all invoices paid',
      icon: DollarSign,
      color: rateColor(kpi.feeCollectionRate),
      href: '/accounts/fees',
    },
    {
      label: 'Pending Approvals',
      value: kpi.pendingApprovals,
      sub: 'awaiting a decision',
      icon: ClipboardList,
      color: kpi.pendingApprovals > 0 ? '#f59e0b' : '#94a3b8',
      href: '/principal/approvals',
    },
  ]
}

function SkeletonCards() {
  return (
    <div className="row g-3 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="col-12 col-sm-6 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body d-flex align-items-center gap-3 py-3 placeholder-glow">
              <div className="rounded-3 flex-shrink-0 placeholder" style={{ width: 44, height: 44 }} />
              <div className="flex-grow-1">
                <div className="placeholder col-6 mb-1 rounded" style={{ height: 20 }} />
                <div className="placeholder col-10 rounded" style={{ height: 14 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardContent() {
  const { data: session } = useSession()
  const { data: kpi, isLoading: kpiLoading, isError: kpiError } = usePrincipalKpi()
  const { data: staffData } = useStaff({ limit: 1 })
  const { data: studentData } = useStudents({ status: 'active', limit: 1 })
  const { data: activity, isLoading: activityLoading } = useRecentActivity(15)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (kpi) setLastUpdated(new Date())
  }, [kpi])

  const stats = kpi ? buildStats(kpi, staffData?.total, studentData?.total) : []
  const firstName = session?.user?.firstName
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={LayoutDashboard}
        title={firstName ? `${greeting()}, ${firstName}` : 'System Admin Dashboard'}
        subtitle={today}
      />

      {kpiLoading && <SkeletonCards />}

      {kpiError && (
        <div
          className="alert d-flex align-items-center gap-3 rounded-4 border-0 mb-4"
          style={{ background: '#fff1f2', borderLeft: '4px solid #ef4444' }}
        >
          <AlertTriangle size={18} color="#ef4444" className="flex-shrink-0" />
          <span className="small">Failed to load dashboard data. The server may be unavailable.</span>
        </div>
      )}

      {!kpiLoading && !kpiError && kpi && (
        <div className="row g-3 mb-3">
          {stats.map((s) => (
            <div key={s.label} className="col-12 col-sm-6 col-lg-4">
              <Link href={s.href} className="text-decoration-none">
                <div
                  className="card border-0 shadow-sm rounded-4 h-100"
                  style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', borderTop: `3px solid ${s.color}` }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = ''
                  }}
                >
                  <div className="card-body d-flex align-items-center gap-3 py-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 48, height: 48, background: `${s.color}1a` }}
                    >
                      <s.icon size={22} color={s.color} />
                    </div>
                    <div>
                      <div className="fw-bold fs-4" style={{ color: s.color, lineHeight: 1.15 }}>{s.value}</div>
                      <div className="fw-semibold small">{s.label}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.sub}</div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-4"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="fw-bold text-white">Quick Actions</span>
        </div>
        <div className="card-body">
          <div className="row g-2">
            {QUICK_ACTIONS.map((a) => (
              <div key={a.label} className="col-6 col-md-4 col-lg-3">
                <Link
                  href={a.href}
                  className="d-flex align-items-center gap-2 p-3 rounded-3 text-decoration-none h-100"
                  style={{ background: '#f8fafc', color: 'var(--edulab-ink)', border: '1px solid var(--edulab-border)' }}
                >
                  <a.icon size={16} style={{ color: 'var(--edulab-accent)' }} className="flex-shrink-0" />
                  <span className="fw-semibold small">{a.label}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent System Activity */}
      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <History size={16} color="white" />
          <span className="fw-bold text-white">Recent System Activity</span>
        </div>
        <div className="card-body p-0">
          {activityLoading && (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 40 }} />
                </div>
              ))}
            </div>
          )}
          {!activityLoading && (activity?.length ?? 0) === 0 && (
            <div className="text-center text-muted py-5">
              <History size={30} className="mb-2 opacity-25" />
              <p className="mb-0 small">No recent activity yet.</p>
            </div>
          )}
          {!activityLoading && activity && activity.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <tbody>
                  {activity.map((row) => {
                    const style = actionStyle(row.action)
                    return (
                      <tr key={row.id}>
                        <td className="ps-4" style={{ width: 40 }}>
                          <span
                            className="badge rounded-pill px-2 py-1 fw-bold"
                            style={{ background: style.bg, color: style.color, fontSize: '0.68rem' }}
                          >
                            {humanize(row.action)}
                          </span>
                        </td>
                        <td className="small">
                          <span className="fw-semibold">{row.actorName}</span>{' '}
                          <span className="text-muted">— {humanize(row.targetType)}</span>
                          {row.reason && (
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>{row.reason}</div>
                          )}
                        </td>
                        <td className="small text-muted text-nowrap pe-4 text-end">{timeAgo(row.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Refresh indicator */}
      <div className="d-flex align-items-center gap-2 text-muted mt-3" style={{ fontSize: '0.72rem' }}>
        <span className="dashboard-live-dot" style={{ background: '#10b981' }} />
        <span>Live · auto-refreshes every 30 s</span>
        {lastUpdated && <span className="ms-1">· Last updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>

      <style jsx>{`
        .dashboard-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
          animation: dashboard-live-pulse 2s ease-in-out infinite;
        }
        @keyframes dashboard-live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.35); }
          50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-live-dot { animation: none; }
        }
      `}</style>
    </div>
  )
}
