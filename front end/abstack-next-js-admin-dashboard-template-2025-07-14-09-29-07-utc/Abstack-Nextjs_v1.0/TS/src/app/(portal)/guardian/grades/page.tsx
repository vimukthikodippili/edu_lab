'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart2, ChevronDown, ChevronRight, GraduationCap, Trophy } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { usePublishedTermResult } from '@/features/grades/hooks/usePublishedTermResult'
import { usePublishedSubjectResults } from '@/features/grades/hooks/usePublishedSubjectResults'
import { usePublishedAssessmentResults } from '@/features/grades/hooks/usePublishedAssessmentResults'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { TopicScoreChips } from '@/features/grades/components/TopicScoreChips'
import type { SubjectResult } from '@/types/sims/grades'

// ApexCharts touches `window` — must never render during SSR.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ─── Per-subject percentage chart with a class-average reference line ─────────

function SubjectPercentageChart({
  subjectResults,
  subjectNameById,
  classAveragePercentage,
}: {
  subjectResults: SubjectResult[]
  subjectNameById: Map<string, string>
  classAveragePercentage: number | null
}) {
  // Numeric Postgres columns come back over the wire as strings — coerce defensively
  // regardless of what the TS type claims, since arithmetic (.toFixed) needs a real number.
  const complete = subjectResults.filter((sr) => sr.isComplete && sr.percentage !== null)
  const classAvg = classAveragePercentage !== null ? Number(classAveragePercentage) : null
  if (complete.length === 0) return null

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <span className="fw-bold text-white">Score by Subject</span>
      </div>
      <div className="card-body">
        <Chart
          type="bar"
          height={Math.max(220, complete.length * 46)}
          series={[{ name: 'Score %', data: complete.map((sr) => Number(sr.percentage)) }]}
          options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
            xaxis: {
              categories: complete.map((sr) => subjectNameById.get(sr.subjectId) ?? sr.subjectId),
              min: 0,
              max: 100,
              title: { text: 'Percentage' },
            },
            colors: ['#6366f1'],
            dataLabels: { enabled: true, formatter: (v: number) => `${v}%` },
            legend: { show: false },
            annotations:
              classAvg !== null
                ? {
                    xaxis: [
                      {
                        x: classAvg,
                        borderColor: '#dc2626',
                        strokeDashArray: 6,
                        label: {
                          text: `Class avg ${classAvg.toFixed(1)}%`,
                          orientation: 'horizontal',
                          style: { background: '#dc2626', color: '#fff', fontSize: '11px' },
                        },
                      },
                    ],
                  }
                : undefined,
          }}
        />
      </div>
    </div>
  )
}

function GradeBadge({ letter }: { letter: string | null }) {
  if (!letter) return <span className="text-muted">—</span>
  const isGood = ['A', 'A+', 'B', 'B+'].includes(letter)
  return (
    <span className={`badge ${isGood ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border`}>
      {letter}
    </span>
  )
}

function SubjectResultRow({
  sr,
  subjectName,
  termId,
  studentId,
}: {
  sr: SubjectResult
  subjectName: string
  termId: number | null
  studentId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const { data: assessmentResults = [], isLoading } = usePublishedAssessmentResults(
    expanded ? termId : null,
    expanded ? sr.subjectId : null,
    studentId,
  )

  return (
    <>
      <tr onClick={() => setExpanded((v) => !v)} style={{ cursor: 'pointer' }}>
        <td className="small fw-semibold d-flex align-items-center gap-1">
          {expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
          {subjectName}
        </td>
        <td className="small text-center">{sr.totalScore} / {sr.totalMaxScore}</td>
        <td className="small text-center">{sr.percentage != null ? `${sr.percentage}%` : '—'}</td>
        <td className="text-center"><GradeBadge letter={sr.letterGrade} /></td>
        <td className="small text-center">{sr.subjectRank ?? '—'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="p-3" style={{ background: '#f8fafc' }}>
              {isLoading ? (
                <div className="text-muted small">Loading…</div>
              ) : assessmentResults.length === 0 ? (
                <div className="text-muted small">No individual assessment results yet.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {assessmentResults.map((ar) => (
                    <div key={ar.assessment.id} className="d-flex flex-wrap align-items-center gap-2">
                      <span className="small fw-semibold" style={{ minWidth: 140 }}>
                        {ar.assessment.title}
                      </span>
                      <span className="small text-muted" style={{ minWidth: 60 }}>
                        {ar.score}/{ar.maxScore}
                      </span>
                      <TopicScoreChips items={ar.topicScores} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function GuardianGradesContent() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [termId, setTermId] = useState<number | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  const { data: terms = [] } = useAcademicTerms()
  const { data: subjects } = useSubjects({ limit: 100 } as any)
  const activeTermId = termId ?? terms[terms.length - 1]?.id ?? null

  const { data: termResult, isLoading: termLoading } = usePublishedTermResult(activeTermId, studentId)
  const { data: subjectResults = [], isLoading: subjectsLoading } = usePublishedSubjectResults(
    activeTermId,
    studentId,
  )

  const subjectNameById = new Map((subjects?.data ?? []).map((s) => [s.id, s.name]))
  const selectedStudent = profile?.students.find((s) => s.id === studentId)

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
            <h4 className="mb-0 fw-bold">Grades</h4>
            <p className="text-muted small mb-0">
              {selectedStudent ? `${selectedStudent.grade.name} — Section ${selectedStudent.classSection.name}` : 'Your child’s published results.'}
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

      {profile.students.length > 1 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body py-3">
            <label className="form-label fw-semibold small mb-2">Child</label>
            <div className="d-flex gap-2 flex-wrap">
              {profile.students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${studentId === s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setStudentId(s.id)}
                >
                  {s.firstName} {s.lastName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {termLoading || subjectsLoading ? (
        <div className="text-muted">Loading…</div>
      ) : !termResult ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            <GraduationCap size={36} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No published results yet</p>
            <p className="small mb-0">Results for this term have not been published yet.</p>
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
              <div>
                <div className="text-muted small">Class Average</div>
                <div className="fs-5 fw-bold">
                  {termResult.classAveragePercentage != null ? `${termResult.classAveragePercentage}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted small">Percentile</div>
                <div className="fs-5 fw-bold d-flex align-items-center gap-1">
                  {termResult.percentile != null ? (
                    <>
                      <Trophy size={16} className="text-warning" />
                      Better than {Math.round(Number(termResult.percentile))}%
                    </>
                  ) : '—'}
                </div>
              </div>
            </div>
          </div>

          <SubjectPercentageChart
            subjectResults={subjectResults}
            subjectNameById={subjectNameById}
            classAveragePercentage={termResult.classAveragePercentage}
          />

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
                    <th className="small text-muted text-center">Subj. Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectResults.map((sr) => (
                    <SubjectResultRow
                      key={sr.id}
                      sr={sr}
                      subjectName={subjectNameById.get(sr.subjectId) ?? sr.subjectId}
                      termId={activeTermId}
                      studentId={studentId as string}
                    />
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

export default function GuardianGradesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianGradesContent />
    </RoleGuard>
  )
}
