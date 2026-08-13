'use client'
import React from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  BarChart2,
  CalendarCheck,
  CalendarClock,
  GraduationCap,
  Trophy,
  BookOpen,
} from 'lucide-react'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useMyMarkCorrections } from '@/features/grades/hooks/useMyMarkCorrections'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useAssessmentPlans } from '@/features/grades/hooks/useAssessmentPlans'
import { useSectionSyllabusSummary } from '@/features/lesson-plan/hooks/useSectionSyllabusSummary'
import { useMonthEndSummary } from '@/features/lesson-plan/hooks/useMonthEndSummary'
import { useExams } from '@/features/exam-halls/hooks/useExams'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

const CURRENT_YEAR = String(new Date().getFullYear())
// Month-end summaries are generated after a month completes — same convention as the
// month-end-summary page itself, not the current in-progress month.
const LAST_MONTH = (() => {
  const now = new Date()
  return now.getMonth() === 0 ? 12 : now.getMonth()
})()

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
  { label: 'Assessment Plans', icon: ClipboardList, href: '/section-head/assessment-plans' },
  { label: 'Class Results', icon: GraduationCap, href: '/section-head/class-results' },
  { label: 'Exam Halls', icon: Trophy, href: '/section-head/exam-halls' },
  { label: 'Month-End Summary', icon: CalendarCheck, href: '/section-head/month-end-summary' },
  { label: 'Syllabus Progress', icon: BarChart2, href: '/section-head/syllabus-progress' },
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function resolveCurrentTermId(terms: { id: number; startDate: string; endDate: string }[] | undefined): number | null {
  if (!terms || terms.length === 0) return null
  const todayISO = new Date().toISOString().slice(0, 10)
  const current = terms.find((t) => t.startDate <= todayISO && t.endDate >= todayISO)
  if (current) return current.id
  const mostRecent = [...terms].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]
  return mostRecent?.id ?? null
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

export default function SectionHeadDashboardContent() {
  const { data: staff } = useMyStaff()
  const { data: corrections, isLoading: correctionsLoading } = useMyMarkCorrections()
  const { data: terms, isLoading: termsLoading } = useAcademicTerms()
  const currentTermId = resolveCurrentTermId(terms)
  const currentTerm = terms?.find((t) => t.id === currentTermId) ?? null
  const { data: plans, isLoading: plansLoading } = useAssessmentPlans(currentTermId)
  const { data: syllabusTeachers, isLoading: syllabusLoading } = useSectionSyllabusSummary({ academicYear: CURRENT_YEAR })
  const { data: monthEndTeachers, isLoading: monthEndLoading } = useMonthEndSummary({ academicYear: CURRENT_YEAR, month: LAST_MONTH })
  const { data: exams, isLoading: examsLoading } = useExams()

  const isLoading = correctionsLoading || termsLoading || syllabusLoading || monthEndLoading || examsLoading

  const pendingCorrections = corrections?.filter((c) => c.status === 'pending').length ?? 0
  const behindScheduleCount = syllabusTeachers?.reduce(
    (sum, t) => sum + t.subjects.filter((s) => s.behindSchedule).length,
    0,
  ) ?? 0
  const incompleteLastMonthCount = monthEndTeachers?.reduce(
    (sum, t) => sum + t.subjects.filter((s) => s.incompleteItems.length > 0).length,
    0,
  ) ?? 0
  const todayISO = new Date().toISOString().slice(0, 10)
  const upcomingExamsCount = exams?.filter((e) => e.date >= todayISO).length ?? 0

  const stats: StatCard[] = [
    {
      label: 'Pending Mark Corrections',
      value: pendingCorrections,
      sub: 'awaiting a decision',
      icon: ClipboardCheck,
      color: pendingCorrections > 0 ? '#f59e0b' : '#94a3b8',
      href: '/teacher/marks',
    },
    {
      label: 'Assessment Plans',
      value: !plansLoading && currentTermId ? (plans?.length ?? 0) : '—',
      sub: currentTerm ? `configured for ${currentTerm.name}` : 'no active term found',
      icon: ClipboardList,
      color: '#6366f1',
      href: '/section-head/assessment-plans',
    },
    {
      label: 'Behind Schedule',
      value: behindScheduleCount,
      sub: 'syllabus units, all grades',
      icon: BarChart2,
      color: behindScheduleCount > 0 ? '#ef4444' : '#94a3b8',
      href: '/section-head/syllabus-progress',
    },
    {
      label: 'Incomplete Lessons',
      value: incompleteLastMonthCount,
      sub: 'last month, all grades',
      icon: CalendarClock,
      color: incompleteLastMonthCount > 0 ? '#f59e0b' : '#94a3b8',
      href: '/section-head/month-end-summary',
    },
    {
      label: 'Upcoming Exams',
      value: upcomingExamsCount,
      sub: 'scheduled from today',
      icon: BookOpen,
      color: '#0891b2',
      href: '/section-head/exam-halls',
    },
  ]

  const firstName = staff?.firstName
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
        title={firstName ? `${greeting()}, ${firstName}` : 'Section Head Dashboard'}
        subtitle={today}
      />

      {isLoading && <SkeletonCards />}

      {!isLoading && (
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

      <div className="d-flex align-items-center gap-2 text-muted mt-3" style={{ fontSize: '0.72rem' }}>
        <span className="dashboard-live-dot" style={{ background: '#10b981' }} />
        <span>Live · KPIs reflect current data on load</span>
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
