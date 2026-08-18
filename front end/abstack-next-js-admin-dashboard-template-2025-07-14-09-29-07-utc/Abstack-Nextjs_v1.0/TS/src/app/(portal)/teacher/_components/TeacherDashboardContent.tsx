'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CalendarClock,
  BellRing,
  UserCheck,
  CheckCircle2,
  PencilLine,
  NotebookPen,
  BookOpen,
  TrendingUp,
  Award,
  ClipboardList,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount'
import { useMyClassTeacherSections } from '@/features/teacher-subject-requirements/hooks/useMyClassTeacherSections'
import { useCheckInStatus } from '@/features/class-check-in/hooks/useCheckInStatus'
import { useMyStaffAttendanceToday } from '@/features/attendance/hooks/useMyStaffAttendanceToday'
import { useCheckInMyAttendance } from '@/features/attendance/hooks/useCheckInMyAttendance'
import FreePeriodWidget from './FreePeriodWidget'
import ClassCheckInWidget from './ClassCheckInWidget'
import PendingNotificationsWidget from './PendingNotificationsWidget'
import ClassSummaryPanel from '@/features/class-check-in/components/ClassSummaryPanel'

interface QuickAction {
  label: string
  icon: React.ElementType
  href: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Mark Attendance', icon: ClipboardCheck, href: '/teacher/attendance' },
  { label: 'Enter Marks', icon: PencilLine, href: '/teacher/marks' },
  { label: 'Class Diary', icon: NotebookPen, href: '/teacher/class-diary' },
  { label: 'Timetable', icon: CalendarClock, href: '/teacher/timetable' },
  { label: 'Lesson Plans', icon: BookOpen, href: '/teacher/syllabus/lesson-plan' },
  { label: 'Class Trends', icon: TrendingUp, href: '/teacher/class-trends' },
  { label: 'My Performance', icon: Award, href: '/teacher/performance' },
  { label: 'My Class — Notes & Promotion', icon: ClipboardList, href: '/teacher/class-teacher' },
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
  icon: React.ElementType
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

function MyAttendanceStatCard() {
  const { data: today, isLoading, isError } = useMyStaffAttendanceToday()
  const checkIn = useCheckInMyAttendance()
  const { showNotification } = useNotificationContext()

  const marked = !!today?.markedToday
  // isError means the account has no linked staff record (or another real failure) — must be
  // shown distinctly from "not marked yet", since a plain "Not marked" + working-looking "Check
  // in now" button would silently fail forever and look identical to the feature not existing.
  const color = isError ? '#94a3b8' : marked ? '#10b981' : '#f59e0b'

  const handleCheckIn = () => {
    checkIn.mutate(undefined, {
      onError: (err) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not check in. Please try again.'
        showNotification({ variant: 'danger', message })
      },
    })
  }

  return (
    <div className="col-12 col-sm-6 col-lg-3">
      <div className="card border-0 shadow-sm rounded-4 h-100" style={{ borderTop: `3px solid ${color}` }}>
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 44, height: 44, background: `${color}1a` }}
          >
            <UserCheck size={20} color={color} />
          </div>
          <div className="flex-grow-1">
            <div className="fw-bold fs-5" style={{ color, lineHeight: 1.15 }}>
              {isLoading ? '—' : isError ? 'Unavailable' : marked ? 'Marked' : 'Not marked'}
            </div>
            <div className="fw-semibold small">My Attendance Today</div>
            {isError ? (
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                No staff record linked to this account — contact your school admin.
              </div>
            ) : marked ? (
              <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                <CheckCircle2 size={11} /> You&rsquo;re checked in for today
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm p-0 border-0 fw-semibold text-decoration-underline"
                style={{ fontSize: '0.7rem', color }}
                onClick={handleCheckIn}
                disabled={checkIn.isPending || isLoading}
              >
                {checkIn.isPending ? 'Checking in…' : 'Check in now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboardContent() {
  const { data: session } = useSession()
  const { data: myStaff } = useMyStaff()
  const { data: unreadData } = useUnreadCount(myStaff?.id ?? null)
  const { data: sections, isLoading: sectionsLoading } = useMyClassTeacherSections()
  const { data: checkInStatus, isLoading: checkInLoading } = useCheckInStatus()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (myStaff) setLastUpdated(new Date())
  }, [myStaff])

  const firstName = session?.user?.firstName
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const currentPeriodValue = checkInLoading
    ? '—'
    : checkInStatus?.isActive && checkInStatus.timetableEntry
      ? `Period ${checkInStatus.timetableEntry.period}`
      : 'Free'

  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid px-4 py-4 edulab-page">
        <PrincipalPageHeader
          icon={LayoutDashboard}
          title={firstName ? `${greeting()}, ${firstName}` : 'Teacher Dashboard'}
          subtitle={today}
        />

        <div className="row g-3 mb-3">
          <MyAttendanceStatCard />
          <StatCard
            label="My Class Sections"
            sub="where you are the class teacher"
            value={sectionsLoading ? '—' : sections?.length ?? 0}
            icon={Users}
            color="#8b5cf6"
            href="/teacher/class-teacher"
          />
          <StatCard
            label="Current Period"
            sub={checkInStatus?.timetableEntry ? checkInStatus.timetableEntry.classSectionName : 'no class scheduled now'}
            value={currentPeriodValue}
            icon={CalendarClock}
            color="#0891b2"
            href="/teacher/timetable"
          />
          <StatCard
            label="Notifications"
            sub="unread, awaiting your review"
            value={unreadData?.count ?? 0}
            icon={BellRing}
            color={(unreadData?.count ?? 0) > 0 ? '#f59e0b' : '#94a3b8'}
            href="/teacher/marks"
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

        {/* Today */}
        <div className="card border-0 shadow-sm rounded-4 mb-3">
          <div
            className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
          >
            <CalendarClock size={16} color="white" />
            <span className="fw-bold text-white">Today</span>
          </div>
          <div className="card-body">
            <p className="text-muted small mb-3">
              Live status for your current class period, pending notifications, and any catch-up work.
            </p>
            <PendingNotificationsWidget />
            <ClassCheckInWidget />
            <ClassSummaryPanel />
            <FreePeriodWidget />
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
    </RoleGuard>
  )
}
