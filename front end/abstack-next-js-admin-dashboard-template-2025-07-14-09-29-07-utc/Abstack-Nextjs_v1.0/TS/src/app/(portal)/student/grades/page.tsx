'use client'
import { useState } from 'react'
import { BarChart2, GraduationCap } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { usePublishedTermResult } from '@/features/grades/hooks/usePublishedTermResult'
import { usePublishedSubjectResults } from '@/features/grades/hooks/usePublishedSubjectResults'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'

function GradeBadge({ letter }: { letter: string | null }) {
  if (!letter) return <span className="text-muted">—</span>
  const isGood = ['A', 'A+', 'B', 'B+'].includes(letter)
  return (
    <span className={`badge ${isGood ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border`}>
      {letter}
    </span>
  )
}

function StudentGradesContent() {
  const { data: myStudent, isLoading: studentLoading, error: studentError } = useMyStudent()
  const { data: terms = [] } = useAcademicTerms()
  const { data: subjects } = useSubjects({ limit: 100 } as any)
  const [termId, setTermId] = useState<number | null>(null)

  const activeTermId = termId ?? terms[terms.length - 1]?.id ?? null
  const { data: termResult, isLoading: termLoading } = usePublishedTermResult(activeTermId)
  const { data: subjectResults = [], isLoading: subjectsLoading } = usePublishedSubjectResults(activeTermId)

  const subjectNameById = new Map((subjects?.data ?? []).map((s) => [s.id, s.name]))

  if (studentLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (studentError || !myStudent) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <BarChart2 size={18} />
          <div>
            <strong>Student record not found.</strong> Your account is not yet linked to a student profile.
            Please contact your school administrator.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <BarChart2 size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">My Grades</h4>
            <p className="text-muted small mb-0">
              {myStudent.grade.name} — Section {myStudent.classSection.name}
            </p>
          </div>
        </div>

        {terms.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 small fw-semibold text-nowrap">Term:</label>
            <select
              className="form-select form-select-sm"
              style={{ width: 200 }}
              value={activeTermId ?? ''}
              onChange={(e) => setTermId(Number(e.target.value))}
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {termLoading || subjectsLoading ? (
        <div className="text-muted">Loading…</div>
      ) : !termResult ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            <GraduationCap size={36} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No published results yet</p>
            <p className="small mb-0">
              {subjectResults.length === 0
                ? "Your school hasn't enrolled you in any subjects yet — contact your school office."
                : 'Results for this term have not been published yet.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body d-flex flex-wrap gap-4">
              <div>
                <div className="text-muted small">Total</div>
                <div className="fs-5 fw-bold">{termResult.totalScore} / {termResult.totalMaxScore}</div>
              </div>
              <div>
                <div className="text-muted small">Percentage</div>
                <div className="fs-5 fw-bold">{termResult.percentage != null ? `${termResult.percentage}%` : '—'}</div>
              </div>
              <div>
                <div className="text-muted small">Class Rank</div>
                <div className="fs-5 fw-bold">{termResult.rank ?? '—'}</div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-3"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <span className="fw-bold text-white">Subject Breakdown</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr className="table-light">
                    <th className="small text-muted">Subject</th>
                    <th className="small text-muted text-center">Score</th>
                    <th className="small text-muted text-center">%</th>
                    <th className="small text-muted text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectResults.map((sr) => (
                    <tr key={sr.id}>
                      <td className="small fw-semibold">{subjectNameById.get(sr.subjectId) ?? sr.subjectId}</td>
                      <td className="small text-center">{sr.totalScore} / {sr.totalMaxScore}</td>
                      <td className="small text-center">{sr.percentage != null ? `${sr.percentage}%` : '—'}</td>
                      <td className="text-center"><GradeBadge letter={sr.letterGrade} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function StudentGradesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentGradesContent />
    </RoleGuard>
  )
}
