'use client'
import dynamic from 'next/dynamic'
import { BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useSchoolSubjectYearTrends } from '@/features/grades/hooks/useSchoolSubjectYearTrends'
import type { SchoolSubjectYearTrend } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-muted small">Not enough history</span>
  }
  const cls = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted'
  return (
    <span className={`d-inline-flex align-items-center gap-1 small fw-semibold ${cls}`}>
      {delta > 0 ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
      {delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pts`}
    </span>
  )
}

function SubjectTrendCard({ subject }: { subject: SchoolSubjectYearTrend }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className="fw-semibold">{subject.subjectName}</span>
          <DeltaBadge delta={subject.yearOverYearDelta} />
        </div>
        {subject.yearlyAverages.length === 0 ? (
          <p className="text-muted small mb-0">No school-wide results yet.</p>
        ) : (
          <Chart
            type="line"
            height={180}
            series={[{ name: 'School Average %', data: subject.yearlyAverages.map((y) => y.schoolAverage) }]}
            options={{
              chart: { toolbar: { show: false } },
              xaxis: { categories: subject.yearlyAverages.map((y) => y.academicYear) },
              yaxis: { min: 0, max: 100, title: { text: '%' } },
              stroke: { curve: 'smooth', width: 3 },
              colors: ['#6366f1'],
              markers: { size: 4 },
              dataLabels: { enabled: false },
              legend: { show: false },
            }}
          />
        )}
        {subject.consistentlyWeakStudentCount > 0 && (
          <div className="mt-2 small text-danger d-flex align-items-center gap-1">
            <AlertTriangle size={13} />
            {subject.consistentlyWeakStudentCount} student(s) consistently below 50%
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsContent() {
  const { data, isLoading, isError } = useSchoolSubjectYearTrends()

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <BarChart3 size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Subject Trends</h4>
          <p className="text-muted small mb-0">School-wide subject performance across years</p>
        </div>
      </div>

      {isLoading ? (
        <div className="row g-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="col-md-4 placeholder-glow">
              <span className="placeholder col-12 rounded" style={{ height: 220 }} />
            </div>
          ))}
        </div>
      ) : isError || !data ? (
        <div className="alert alert-danger py-2 small">Failed to load school-wide subject trends. Please refresh.</div>
      ) : (
        <>
          {data.mostConsistentlyWeakSubject && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-4">
              <AlertTriangle size={18} />
              <div>
                <strong>{data.mostConsistentlyWeakSubject.subjectName}</strong> has the most students
                (<strong>{data.mostConsistentlyWeakSubject.weakStudentCount}</strong>) consistently scoring below 50%
                across terms — may be worth a closer look.
              </div>
            </div>
          )}

          {data.subjects.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5 text-muted">
                <BarChart3 size={40} className="mb-3 opacity-25" />
                <p className="fw-medium mb-1">No published results yet</p>
                <p className="small mb-0">Subject trends will appear here once terms are complete and published.</p>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {data.subjects.map((s) => (
                <div key={s.subjectId} className="col-md-6 col-lg-4">
                  <SubjectTrendCard subject={s} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function PrincipalAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.SECTION_HEAD]}>
      <AnalyticsContent />
    </RoleGuard>
  )
}
