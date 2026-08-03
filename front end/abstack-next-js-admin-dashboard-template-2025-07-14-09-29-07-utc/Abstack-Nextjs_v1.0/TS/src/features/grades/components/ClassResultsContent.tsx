'use client'
import React, { useEffect, useState } from 'react'
import { AlertCircle, Download, Send, Trophy } from 'lucide-react'
import { useAcademicTerms } from '../hooks/useAcademicTerms'
import { useClassResults } from '../hooks/useClassResults'
import { usePublishResults } from '../hooks/usePublishResults'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { ClassRankRow } from '@/types/sims/grades'

function PercentageCell({ row }: { row: ClassRankRow }) {
  if (!row.isComplete) {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '0.7rem' }}
      >
        Not yet complete
      </span>
    )
  }
  return (
    <span className="text-muted small">
      {row.percentage !== null ? `${row.percentage.toFixed(2)}%` : '—'}
    </span>
  )
}

export function ClassResultsContent() {
  const { user } = useAuthStore()
  const { showNotification } = useNotificationContext()
  const canPublish = user?.role === ROLES.PRINCIPAL || user?.role === ROLES.SECTION_HEAD

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<number | null>(null)

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: classSections = [], isLoading: sectionsLoading } = useClassSections()
  const { data: rows = [], isLoading: rowsLoading } = useClassResults(
    selectedClassSectionId,
    selectedTermId,
  )
  const publishMutation = usePublishResults()

  const handlePublish = () => {
    if (!selectedClassSectionId || !selectedTermId) return
    if (
      !window.confirm(
        'Publish results for this class and term? This will make completed results visible and generate report cards. Continue?',
      )
    )
      return

    publishMutation.mutate(
      { classSectionId: selectedClassSectionId, termId: selectedTermId },
      {
        onSuccess: (summary) => {
          showNotification({
            variant: 'success',
            message: `Published ${summary.publishedCount} result(s). ${summary.skippedIncompleteCount} incomplete result(s) skipped, ${summary.alreadyPublishedCount} already published.`,
          })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? err.message ?? 'Failed to publish results.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  useEffect(() => {
    if (terms.length > 0 && selectedTermId === null) {
      setSelectedTermId(terms[0].id)
    }
  }, [terms, selectedTermId])

  useEffect(() => {
    if (classSections.length > 0 && selectedClassSectionId === null) {
      setSelectedClassSectionId(classSections[0].id)
    }
  }, [classSections, selectedClassSectionId])

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
          >
            <Trophy size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Class Results</h4>
            <p className="mb-0 text-muted small">Ranked results for a class section and term</p>
          </div>
        </div>

        {canPublish && (
          <button
            type="button"
            className="btn d-flex align-items-center gap-2 text-white fw-semibold px-4"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }}
            disabled={!selectedTermId || !selectedClassSectionId || publishMutation.isPending}
            onClick={handlePublish}
          >
            <Send size={15} />
            {publishMutation.isPending ? 'Publishing…' : 'Publish Results'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="row align-items-center g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Academic Term</label>
              {termsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedTermId ?? ''}
                  onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Select a term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Class Section</label>
              {sectionsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedClassSectionId ?? ''}
                  onChange={(e) =>
                    setSelectedClassSectionId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— Select a class section —</option>
                  {classSections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grade.name} · Section {c.name} ({c.academicYear})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          {!selectedTermId || !selectedClassSectionId ? (
            <div className="text-center py-5 text-muted">
              <Trophy size={40} className="mb-3 opacity-25" />
              <p className="mb-0">Select a term and class section to view results.</p>
            </div>
          ) : rowsLoading ? (
            <div className="p-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="placeholder-glow mb-3">
                  <span className="placeholder col-12 rounded" style={{ height: 32 }} />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <Trophy size={40} className="mb-3 opacity-25" />
              <p className="mb-1 fw-semibold">No results yet</p>
              <p className="mb-0 small">No results have been computed for this class and term.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">#</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Rank</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Student</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Total / Max</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Percentage</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Status</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Report Card</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.studentId}>
                      <td className="px-4 text-muted small">{idx + 1}</td>
                      <td>
                        {row.rank !== null ? (
                          <span
                            className="badge rounded-pill fw-bold px-3 py-2"
                            style={{
                              background: 'linear-gradient(135deg,#667eea,#764ba2)',
                              color: 'white',
                              fontSize: '0.85rem',
                            }}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold small">
                          {row.lastName}, {row.firstName}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {row.admissionNumber}
                        </div>
                      </td>
                      <td className="small">
                        {row.totalScore} / {row.totalMaxScore}
                      </td>
                      <td>
                        <PercentageCell row={row} />
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          {row.isComplete ? (
                            <span
                              className="badge rounded-pill px-2 py-1 fw-bold"
                              style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}
                            >
                              Complete
                            </span>
                          ) : (
                            <span
                              className="badge rounded-pill px-2 py-1 fw-bold"
                              style={{ background: '#fef9c3', color: '#92400e', fontSize: '0.7rem' }}
                            >
                              In progress
                            </span>
                          )}
                          {row.isPublished && (
                            <span
                              className="badge rounded-pill px-2 py-1 fw-bold"
                              style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem' }}
                            >
                              Published
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.reportCardPath ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${row.reportCardPath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1 text-primary"
                          >
                            <Download size={14} /> Download
                          </a>
                        ) : (
                          <span className="text-muted small">—</span>
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

      {!termsLoading && terms.length === 0 && (
        <div
          className="rounded-3 p-3 mt-4 d-flex align-items-center gap-2"
          style={{ background: '#fff7ed', color: '#c2410c', fontSize: '0.85rem' }}
        >
          <AlertCircle size={16} />
          No academic terms configured yet.
        </div>
      )}
    </div>
  )
}
