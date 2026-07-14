'use client'
import { Compass, History } from 'lucide-react'
import { useStudentCareerResults } from '../hooks/useStudentCareerResults'

const LEVEL_LABEL: Record<string, string> = { low: 'Lower', moderate: 'Moderate', high: 'Higher' }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  userId: number
  studentName: string
}

export function CareerResultsTrend({ userId, studentName }: Props) {
  const { data: results, isLoading } = useStudentCareerResults(userId)

  return (
    <div className="card border-0 shadow-sm">
      <div
        className="card-header border-0 py-3 px-4 d-flex align-items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <Compass size={16} className="text-white" />
        <span className="fw-semibold text-white">{studentName} — Self-Discovery Trend</span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-muted small py-3">Loading…</div>
        ) : !results?.length ? (
          <div className="text-center text-muted py-5">
            <History size={32} className="mb-2 opacity-50" />
            <p className="mb-0 small">This student has not taken the self-discovery questionnaire yet.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {results.map((r) => (
              <div key={r.id} className="border rounded-3 p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-primary-subtle text-primary border">{r.academicYear}</span>
                  <span className="text-muted small">{formatDate(r.createdAt)}</span>
                </div>

                {r.oceanTraitDescriptions.length > 0 && (
                  <div className="mb-2">
                    <p className="fw-semibold small mb-1">Personality Traits</p>
                    <div className="d-flex flex-wrap gap-2">
                      {r.oceanTraitDescriptions.map((t) => (
                        <span key={t.trait} className="badge bg-secondary-subtle text-secondary border text-capitalize" style={{ fontWeight: 500 }}>
                          {t.trait}: {LEVEL_LABEL[t.level]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {r.riasecSuggestions && r.riasecSuggestions.length > 0 && (
                  <div>
                    <p className="fw-semibold small mb-1">Exploration Suggestions</p>
                    <ul className="small text-muted mb-0 ps-3">
                      {r.riasecSuggestions.map((s) => (
                        <li key={s.dimension}>{s.label}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!r.riasecScores && (
                  <p className="small text-muted mb-0 fst-italic">Interest section not yet completed for this attempt.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
