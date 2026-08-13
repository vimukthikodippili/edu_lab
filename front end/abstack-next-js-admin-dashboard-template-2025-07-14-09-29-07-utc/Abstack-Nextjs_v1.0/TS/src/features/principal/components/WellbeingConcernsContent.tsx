'use client'
import { HeartPulse, CheckCircle2 } from 'lucide-react'
import { useWellbeingConcerns } from '../hooks/useWellbeingConcerns'
import { DOMAIN_RESULT_LEVEL_LABELS, LEVEL_BADGE_CLASS } from '@/types/sims/domain-result'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

// FR-MHA-34/AC #92-94 — a de-identified-of-clinical-detail drill-down: student name, grade, and
// overall severity only. No domain names, no risk-category names, no notes — matching AC #93's
// "no category names or disorder names shown" for the KPI it drills down from.
export function WellbeingConcernsContent() {
  const { data: concerns, isLoading } = useWellbeingConcerns()

  return (
    <div className="container-fluid py-4 edulab-page">
      <PrincipalPageHeader
        icon={HeartPulse}
        title="Students with Elevated Wellbeing Concern"
        subtitle="Non-diagnostic — see the school counselor for detail. No screening or clinical information shown here."
      />

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="fw-bold text-white">Students</span>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <span key={i} className="placeholder col-12 mb-2 d-block" style={{ height: 40 }} />
              ))}
            </div>
          ) : !concerns?.length ? (
            <div className="p-5 text-center text-muted">
              <CheckCircle2 size={36} className="mb-2 opacity-25" />
              <p className="fw-semibold mb-0">No students currently flagged.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Student</th>
                    <th>Grade</th>
                    <th className="pe-4">Highest Level</th>
                  </tr>
                </thead>
                <tbody>
                  {concerns.map((row) => (
                    <tr key={row.studentId}>
                      <td className="ps-4 fw-semibold small">{row.studentName}</td>
                      <td className="small">{row.grade}</td>
                      <td className="pe-4">
                        <span className={`badge ${LEVEL_BADGE_CLASS[row.maxLevel]}`}>
                          {DOMAIN_RESULT_LEVEL_LABELS[row.maxLevel]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
