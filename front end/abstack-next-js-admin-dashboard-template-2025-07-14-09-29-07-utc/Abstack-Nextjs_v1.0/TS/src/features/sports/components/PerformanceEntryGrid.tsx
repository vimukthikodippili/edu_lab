'use client'
import { useEffect, useState } from 'react'
import { Star, Lock, Unlock, Save, Send } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { usePerformanceGrid } from '../hooks/usePerformanceGrid'
import { useSavePerformance } from '../hooks/useSavePerformance'
import { useGrantOverride } from '../hooks/useGrantOverride'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const PERSONAL_BEST_COLUMN_NAME = 'Personal best flag'

export default function PerformanceEntryGrid({
  sportId,
  matchId,
  canManage,
}: {
  sportId: string
  matchId: string
  canManage: boolean
}) {
  const { showNotification } = useNotificationContext()
  const currentRole = useAuthStore((s) => s.user?.role)
  const canGrantOverride = currentRole === ROLES.SYSTEM_ADMIN || currentRole === ROLES.PRINCIPAL

  const { data: grid, isLoading } = usePerformanceGrid(sportId, matchId)
  const saveMutation = useSavePerformance(sportId, matchId)
  const overrideMutation = useGrantOverride(sportId, matchId)

  const [values, setValues] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    if (!grid) return
    const initial: Record<string, Record<string, string>> = {}
    for (const row of grid.roster) {
      initial[row.studentId] = Object.fromEntries(
        Object.entries(row.metricValues).map(([k, v]) => [k, String(v)]),
      )
    }
    setValues(initial)
  }, [grid])

  if (isLoading || !grid) {
    return (
      <div className="border-top pt-3 mt-2 placeholder-glow">
        <div className="placeholder col-12 rounded" style={{ height: 100 }} />
      </div>
    )
  }

  const entryMetrics = grid.metrics.filter((m) => m.metricName !== PERSONAL_BEST_COLUMN_NAME)
  const hasPersonalBestColumn = grid.metrics.some((m) => m.metricName === PERSONAL_BEST_COLUMN_NAME)

  const setCell = (studentId: string, metricName: string, raw: string) => {
    setValues((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [metricName]: raw },
    }))
  }

  const buildPayloadEntries = () =>
    Object.entries(values)
      .map(([studentId, cells]) => {
        const metricValues: Record<string, number> = {}
        for (const [metricName, raw] of Object.entries(cells)) {
          if (raw.trim() === '') continue
          const num = Number(raw)
          if (!Number.isNaN(num)) metricValues[metricName] = num
        }
        return { studentId, metricValues }
      })
      .filter((e) => Object.keys(e.metricValues).length > 0)

  const handleSave = (status: 'draft' | 'submitted') => {
    const entries = buildPayloadEntries()
    if (entries.length === 0) {
      showNotification({ variant: 'warning', message: 'Enter at least one metric value before saving.' })
      return
    }
    saveMutation.mutate(
      { status, entries },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: status === 'submitted' ? 'Performance submitted.' : 'Draft saved.',
          })
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleGrantOverride = (performanceId: string) => {
    overrideMutation.mutate(performanceId, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Edit override granted for this student.' }),
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  return (
    <div className="border-top pt-3 mt-2">
      {grid.roster.length === 0 ? (
        <p className="text-muted small mb-0">No active students enrolled in this sport.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="small text-muted">
                <th style={{ minWidth: 140 }}>Student</th>
                {entryMetrics.map((m) => (
                  <th key={m.id} style={{ minWidth: 100 }}>
                    {m.metricName}
                    {m.unit && <span className="text-muted fw-normal"> ({m.unit})</span>}
                  </th>
                ))}
                {hasPersonalBestColumn && <th style={{ minWidth: 80 }}>Best</th>}
                <th style={{ minWidth: 90 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {grid.roster.map((row) => {
                const locked = canManage && !row.canEdit
                const isAnyPersonalBest = Object.values(row.personalBests).some(Boolean)
                return (
                  <tr key={row.studentId}>
                    <td className="small">
                      {row.firstName} {row.lastName}
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>{row.admissionNumber}</div>
                    </td>
                    {entryMetrics.map((m) => (
                      <td key={m.id}>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ width: 90 }}
                          value={values[row.studentId]?.[m.metricName] ?? ''}
                          disabled={!canManage || locked}
                          placeholder="—"
                          onChange={(e) => setCell(row.studentId, m.metricName, e.target.value)}
                        />
                        {row.personalBests[m.metricName] && (
                          <Star size={12} className="ms-1" style={{ color: '#d97706', fill: '#d97706' }} />
                        )}
                      </td>
                    ))}
                    {hasPersonalBestColumn && (
                      <td>
                        {isAnyPersonalBest ? (
                          <span className="badge rounded-pill px-2 py-1 fw-bold d-inline-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e' }}>
                            <Star size={11} style={{ fill: '#92400e' }} /> PB
                          </span>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    )}
                    <td>
                      {row.status ? (
                        <span
                          className="badge rounded-pill px-2 py-1"
                          style={
                            row.status === 'submitted'
                              ? { background: '#dcfce7', color: '#15803d' }
                              : { background: '#f1f5f9', color: '#6b7280' }
                          }
                        >
                          {row.status === 'submitted' ? 'Submitted' : 'Draft'}
                        </span>
                      ) : (
                        <span className="text-muted small">Not entered</span>
                      )}
                      {locked && (
                        <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.72rem' }}>
                          <Lock size={11} className="text-danger" />
                          <span className="text-danger">Locked</span>
                          {canGrantOverride && row.performanceId && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-1 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.72rem' }}
                              disabled={overrideMutation.isPending}
                              onClick={() => handleGrantOverride(row.performanceId as string)}
                            >
                              <Unlock size={11} /> Grant override
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManage && grid.roster.length > 0 && (
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            disabled={saveMutation.isPending}
            onClick={() => handleSave('draft')}
          >
            <Save size={13} /> Save Draft
          </button>
          <button
            type="button"
            className="btn btn-sm text-white d-flex align-items-center gap-1"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            disabled={saveMutation.isPending}
            onClick={() => handleSave('submitted')}
          >
            {saveMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <Send size={13} />}
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
