'use client'
import { useEffect, useState, type ElementType } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  GraduationCap,
  CalendarClock,
  MessageSquareWarning,
  FileSignature,
  ListChecks,
  FlaskConical,
  BarChart2,
  Heart,
  Trophy,
  CalendarDays,
  ClipboardCheck,
  ShieldAlert,
  CheckCheck,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useGuardianNotifications } from '@/features/notifications/hooks/useGuardianNotifications'
import { useGuardianUnreadCount } from '@/features/notifications/hooks/useGuardianUnreadCount'
import { useMarkGuardianNotificationRead } from '@/features/notifications/hooks/useMarkGuardianNotificationRead'
import { useMyPendingConsentForms } from '@/features/consent-forms/hooks/useMyPendingConsentForms'
import { useMyBookings } from '@/features/ptm/hooks/useMyBookings'
import { iconForNotificationType, notificationTimeAgo } from '@/features/notifications/utils/notificationTypeIcon'

interface QuickLink {
  label: string
  icon: ElementType
  href: string
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'My Children', icon: GraduationCap, href: '/guardian/children' },
  { label: 'Parent-Teacher Meetings', icon: CalendarClock, href: '/guardian/ptm' },
  { label: 'Feedback & Complaints', icon: MessageSquareWarning, href: '/guardian/feedback' },
  { label: 'Consent Forms', icon: FileSignature, href: '/guardian/consent-forms' },
  { label: 'Homework & Assignments', icon: ListChecks, href: '/guardian/assignments' },
  { label: 'Lab Reports', icon: FlaskConical, href: '/guardian/lab-reports' },
  { label: 'Grades', icon: BarChart2, href: '/guardian/grades' },
  { label: 'Wellbeing Updates', icon: Heart, href: '/guardian/wellbeing' },
  { label: 'Sports Performance', icon: Trophy, href: '/guardian/sports' },
  { label: 'School Events', icon: CalendarDays, href: '/guardian/events' },
  { label: 'Admit Cards', icon: ClipboardCheck, href: '/guardian/admit-cards' },
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function StatCard({
  label,
  sub,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  sub: string
  value: string | number
  icon: ElementType
  color: string
  href: string
}) {
  return (
    <div className="col-12 col-sm-6 col-lg-3">
      <Link href={href} className="text-decoration-none">
        <div
          className="card border-0 shadow-sm rounded-4 h-100"
          style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', borderTop: `3px solid ${color}` }}
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
              style={{ width: 44, height: 44, background: `${color}1a` }}
            >
              <Icon size={20} color={color} />
            </div>
            <div>
              <div className="fw-bold fs-5" style={{ color, lineHeight: 1.15 }}>{value}</div>
              <div className="fw-semibold small">{label}</div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>{sub}</div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

function GuardianContent() {
  const { data: session } = useSession()
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const { data: notifications, isLoading, isError } = useGuardianNotifications()
  const { data: unreadData } = useGuardianUnreadCount()
  const markRead = useMarkGuardianNotificationRead()
  const { data: pendingConsent } = useMyPendingConsentForms()
  const { data: ptmBookings } = useMyBookings()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (profile) setLastUpdated(new Date())
  }, [profile])

  const unreadCount = unreadData?.count ?? 0
  // Read updates drop out of the panel rather than lingering — same behavior as the topbar bell.
  const unreadItems = (notifications ?? []).filter((n) => !n.isRead)
  const confirmedPtmCount = (ptmBookings ?? []).filter((b) => b.status === 'confirmed').length

  const firstName = session?.user?.firstName
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (profileLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning">
          Your account is not yet linked to a guardian record. Please contact your school administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={LayoutDashboard}
        title={firstName ? `${greeting()}, ${firstName}` : 'Guardian Dashboard'}
        subtitle={`${today} · ${profile.students.length} child${profile.students.length === 1 ? '' : 'ren'} linked to your account`}
      />

      <div className="row g-3 mb-3">
        <StatCard
          label="My Children"
          sub="linked to your account"
          value={profile.students.length}
          icon={GraduationCap}
          color="#8b5cf6"
          href="/guardian/children"
        />
        <StatCard
          label="Unread Updates"
          sub="new notifications"
          value={unreadCount}
          icon={ShieldAlert}
          color={unreadCount > 0 ? '#dc2626' : '#94a3b8'}
          href="#updates"
        />
        <StatCard
          label="Pending Consent Forms"
          sub="awaiting your response"
          value={pendingConsent?.length ?? 0}
          icon={FileSignature}
          color={(pendingConsent?.length ?? 0) > 0 ? '#d97706' : '#94a3b8'}
          href="/guardian/consent-forms"
        />
        <StatCard
          label="PTM Bookings"
          sub="confirmed meetings"
          value={confirmedPtmCount}
          icon={CalendarClock}
          color="#0891b2"
          href="/guardian/ptm"
        />
      </div>

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
            {QUICK_LINKS.map((l) => (
              <div key={l.label} className="col-6 col-md-4 col-lg-3">
                <Link
                  href={l.href}
                  className="d-flex align-items-center gap-2 p-3 rounded-3 text-decoration-none h-100"
                  style={{ background: '#f8fafc', color: 'var(--edulab-ink)', border: '1px solid var(--edulab-border)' }}
                >
                  <l.icon size={16} style={{ color: 'var(--edulab-accent)' }} className="flex-shrink-0" />
                  <span className="fw-semibold small">{l.label}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Updates */}
      <div id="updates" className="card border-0 shadow-sm rounded-4 mb-3">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center justify-content-between gap-2"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="d-flex align-items-center gap-2 fw-bold text-white">
            <ShieldAlert size={16} /> Updates
          </span>
          {unreadItems.length === 0 && !isLoading && !isError && (
            <span className="badge rounded-pill bg-white text-success small fw-semibold d-flex align-items-center gap-1">
              <CheckCheck size={12} /> All caught up
            </span>
          )}
        </div>
        <div className="card-body">
          {isLoading && (
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3 p-3 mb-3 border placeholder-glow">
                  <div className="d-flex gap-3">
                    <span className="placeholder rounded-3 flex-shrink-0" style={{ width: 40, height: 40 }} />
                    <div className="flex-grow-1">
                      <span className="placeholder col-4 d-block mb-2" style={{ height: 14 }} />
                      <span className="placeholder col-8 d-block mb-2" style={{ height: 12 }} />
                      <span className="placeholder col-3 d-block" style={{ height: 12 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="alert alert-danger py-2 small mb-0">
              Failed to load updates. Please try refreshing.
            </div>
          )}

          {!isLoading && !isError && unreadItems.length === 0 && (
            <div className="text-center py-5">
              <div
                className="rounded-circle bg-success bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 64, height: 64 }}
              >
                <CheckCheck size={28} className="text-success" />
              </div>
              <h6 className="fw-semibold text-success mb-1">No new updates</h6>
              <p className="text-muted small mb-0">You&rsquo;re all caught up.</p>
            </div>
          )}

          {!isLoading && !isError && unreadItems.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {unreadItems.map((n) => {
                const { icon: Icon, color } = iconForNotificationType(n.type)
                const meta = n.metadata
                const sectionLabel = typeof meta?.sectionLabel === 'string' ? meta.sectionLabel : null
                const metaDate = typeof meta?.date === 'string' ? meta.date : null
                const formattedDate = metaDate
                  ? new Date(metaDate + 'T00:00:00Z').toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
                  : null

                return (
                  <div key={n.id} className="d-flex align-items-start gap-3 p-3 rounded-3 border">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 40, height: 40, background: `${color}1a` }}
                    >
                      <Icon size={18} color={color} />
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold small">{n.title}</div>
                      <p className="small text-body mb-1" style={{ lineHeight: 1.5 }}>{n.message}</p>
                      {(sectionLabel || formattedDate) && (
                        <div className="d-flex flex-wrap gap-2 mb-1">
                          {sectionLabel && (
                            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill small">{sectionLabel}</span>
                          )}
                          {formattedDate && (
                            <span className="badge bg-light text-secondary border rounded-pill small">{formattedDate}</span>
                          )}
                        </div>
                      )}
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>{notificationTimeAgo(n.createdAt)}</span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 d-flex align-items-center gap-1"
                          style={{ fontSize: '0.72rem', height: 24 }}
                          onClick={() => markRead.mutate(n.id)}
                          disabled={markRead.isPending}
                        >
                          <CheckCheck size={11} /> Mark as Read
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Refresh indicator */}
      <div className="d-flex align-items-center gap-2 text-muted mt-3" style={{ fontSize: '0.72rem' }}>
        <span className="dashboard-live-dot" style={{ background: '#10b981' }} />
        <span>Live · refreshes automatically</span>
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

export default function GuardianDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianContent />
    </RoleGuard>
  )
}
