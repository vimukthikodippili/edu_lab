'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSportTypeMetrics } from '../hooks/useSportTypeMetrics'
import { useCreateSportTypeMetric } from '../hooks/useCreateSportTypeMetric'
import { useDeleteSportTypeMetric } from '../hooks/useDeleteSportTypeMetric'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

export default function SportTypeMetricsPanel({ sportTypeId }: { sportTypeId: string }) {
  const { showNotification } = useNotificationContext()
  const { data: metrics, isLoading } = useSportTypeMetrics(sportTypeId)
  const createMutation = useCreateSportTypeMetric()
  const deleteMutation = useDeleteSportTypeMetric()

  const [metricName, setMetricName] = useState('')
  const [unit, setUnit] = useState('')
  const [isTimeBased, setIsTimeBased] = useState(false)
  const [isDistanceBased, setIsDistanceBased] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const handleAdd = () => {
    if (!metricName.trim()) return
    createMutation.mutate(
      {
        sportTypeId,
        payload: {
          metricName: metricName.trim(),
          unit: unit.trim() || undefined,
          isTimeBased,
          isDistanceBased,
          ordering: (metrics?.length ?? 0) + 1,
        },
      },
      {
        onSuccess: () => {
          setMetricName('')
          setUnit('')
          setIsTimeBased(false)
          setIsDistanceBased(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleDelete = (metricId: string) => {
    deleteMutation.mutate(
      { sportTypeId, metricId },
      {
        onSuccess: () => setPendingDelete(null),
        onError: (err) => {
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
          setPendingDelete(null)
        },
      },
    )
  }

  return (
    <div className="border-top pt-3 mt-2">
      {isLoading ? (
        <div className="placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
      ) : (metrics?.length ?? 0) === 0 ? (
        <p className="text-muted small mb-3">No metrics defined yet — add one below.</p>
      ) : (
        <div className="table-responsive mb-3">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="small text-muted">
                <th>Metric</th>
                <th>Unit</th>
                <th>Time-based</th>
                <th>Distance-based</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {(metrics ?? []).map((m) => (
                <tr key={m.id}>
                  <td className="small">{m.metricName}</td>
                  <td className="small text-muted">{m.unit ?? '—'}</td>
                  <td className="small">{m.isTimeBased ? 'Yes' : 'No'}</td>
                  <td className="small">{m.isDistanceBased ? 'Yes' : 'No'}</td>
                  <td className="text-end">
                    {pendingDelete === m.id ? (
                      <span className="d-inline-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(m.id)}
                        >
                          {deleteMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => setPendingDelete(null)}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-1 text-danger"
                        title="Delete metric"
                        onClick={() => setPendingDelete(m.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-3">
          <label className="form-label small fw-semibold mb-1">Metric name</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Points scored"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small fw-semibold mb-1">Unit</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. points"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2 form-check ms-1">
          <input
            type="checkbox"
            className="form-check-input"
            id={`timeBased-${sportTypeId}`}
            checked={isTimeBased}
            onChange={(e) => setIsTimeBased(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor={`timeBased-${sportTypeId}`}>Time-based</label>
        </div>
        <div className="col-6 col-md-2 form-check ms-1">
          <input
            type="checkbox"
            className="form-check-input"
            id={`distanceBased-${sportTypeId}`}
            checked={isDistanceBased}
            onChange={(e) => setIsDistanceBased(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor={`distanceBased-${sportTypeId}`}>Distance-based</label>
        </div>
        <div className="col-6 col-md-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm w-100"
            disabled={!metricName.trim() || createMutation.isPending}
            onClick={handleAdd}
          >
            {createMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <><Plus size={14} className="me-1" /> Add</>}
          </button>
        </div>
      </div>
    </div>
  )
}
