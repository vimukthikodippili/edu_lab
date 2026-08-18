'use client'
import { useEffect, useMemo, useState } from 'react'
import { LineChart, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useMyAssessments } from '@/features/grades/hooks/useMyAssessments'
import { useClassSubjectTrend } from '@/features/grades/hooks/useClassSubjectTrend'

function resolveCurrentTermId(terms: { id: number; startDate: string; endDate: string }[]): number | null {
  if (terms.length === 0) return null
  const todayISO = new Date().toISOString().slice(0, 10)
  const current = terms.find((t) => t.startDate <= todayISO && t.endDate >= todayISO)
  if (current) return current.id
  const mostRecent = [...terms].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]
  return mostRecent?.id ?? null
}

function cellStyle(average: number | null, classAverage: number | null) {
  if (average === null) return { background: 'transparent', color: '#94a3b8' }
  if (classAverage === null) return {}
  if (average > classAverage) return { background: '#dcfce7', color: '#15803d' }
  if (average < classAverage) return { background: '#fee2e2', color: '#dc2626' }
  return { background: '#ffffff' }
}

function ClassTrendsContent() {
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>('')

  const { data: terms = [] } = useAcademicTerms()
  const { data: assessments = [] } = useMyAssessments(selectedTermId)

  useEffect(() => {
    if (terms.length > 0 && selectedTermId === null) {
      setSelectedTermId(resolveCurrentTermId(terms))
    }
  }, [terms, selectedTermId])

  const subjectClassOptions = useMemo(() => {
    const map = new Map<string, { subjectId: string; classSectionId: number; subjectName: string; classSectionName: string }>()
    assessments.forEach((a) => {
      const key = `${a.subjectId}::${a.classSectionId}`
      if (!map.has(key)) {
        map.set(key, {
          subjectId: a.subjectId,
          classSectionId: a.classSectionId,
          subjectName: a.subject.name,
          classSectionName: a.classSection?.name ?? `Section ${a.classSectionId}`,
        })
      }
    })
    return [...map.values()]
  }, [assessments])

  useEffect(() => {
    if (subjectClassOptions.length > 0 && !selectedKey) {
      setSelectedKey(`${subjectClassOptions[0].subjectId}::${subjectClassOptions[0].classSectionId}`)
    }
  }, [subjectClassOptions, selectedKey])

  const [subjectId, classSectionIdStr] = selectedKey ? selectedKey.split('::') : [null, null]
  const classSectionId = classSectionIdStr ? Number(classSectionIdStr) : null

  const { data: grid, isLoading, isError } = useClassSubjectTrend(classSectionId, subjectId)

  const weakCount = grid?.rows.filter((r) => r.consistentlyWeak).length ?? 0

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <LineChart size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Class Trends</h4>
          <p className="text-muted small mb-0">Multi-term subject performance for your classes</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-8">
              <label className="form-label small fw-semibold">Class / Subject</label>
              <select className="form-select form-select-sm" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                {subjectClassOptions.map((opt) => {
                  const key = `${opt.subjectId}::${opt.classSectionId}`
                  return (
                    <option key={key} value={key}>
                      {opt.subjectName} · {opt.classSectionName}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="fw-bold text-white">{grid?.subjectName ?? 'Term-by-Term Averages'}</span>
          {weakCount > 0 && (
            <span className="badge rounded-pill d-inline-flex align-items-center gap-1" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={12} /> {weakCount} consistently weak
            </span>
          )}
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 40 }} />
                </div>
              ))}
            </div>
          ) : isError || !grid ? (
            <div className="alert alert-danger py-2 small m-3 mb-0">Failed to load class trends. Please refresh.</div>
          ) : grid.terms.length === 0 ? (
            <div className="text-center text-muted py-5">
              <LineChart size={36} className="mb-2 opacity-25" />
              <p className="small mb-0">No results yet for this class and subject.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">Student</th>
                    {grid.terms.map((t) => (
                      <th key={t.termId} className="py-3 text-muted small fw-semibold border-0 text-center">
                        {t.termLabel}
                      </th>
                    ))}
                    <th className="py-3 text-muted small fw-semibold border-0 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((row) => (
                    <tr key={row.studentId}>
                      <td className="px-4">
                        <div className="fw-semibold small">{row.firstName} {row.lastName}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{row.admissionNumber}</div>
                      </td>
                      {row.cells.map((cell) => (
                        <td key={cell.termId} className="text-center">
                          <span
                            className="badge rounded-pill px-2 py-1"
                            style={{ ...cellStyle(cell.average, cell.classAverage), minWidth: 56, display: 'inline-block' }}
                          >
                            {cell.average !== null ? `${cell.average.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 text-end">
                        {row.consistentlyWeak && (
                          <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: '0.7rem' }}>
                            Consistently Weak
                          </span>
                        )}
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

export default function TeacherClassTrendsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <ClassTrendsContent />
    </RoleGuard>
  )
}
