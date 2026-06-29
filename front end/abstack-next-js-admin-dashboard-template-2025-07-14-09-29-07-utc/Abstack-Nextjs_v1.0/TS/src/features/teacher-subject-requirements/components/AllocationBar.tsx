'use client'
import React from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface Props {
  allocated: number
  total: number | null
  available: number | null
}

export function AllocationBar({ allocated, total, available }: Props) {
  if (total === null) {
    return (
      <div className="d-flex align-items-center gap-2 p-3 rounded-2 bg-light border small text-muted">
        <Info size={15} />
        No calendar configuration found for this grade stage. Configure it in{' '}
        <strong>Academic Setup → School Calendar</strong> first.
      </div>
    )
  }

  const pct = Math.min(100, Math.round((allocated / total) * 100))
  const isOver = allocated > total
  const barColor = isOver ? 'bg-danger' : allocated >= total * 0.9 ? 'bg-warning' : 'bg-success'

  return (
    <div
      className="rounded-2 p-3"
      style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6' }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          {isOver ? (
            <AlertTriangle size={15} className="text-danger" />
          ) : (
            <CheckCircle2 size={15} className="text-success" />
          )}
          <span className="small fw-semibold text-dark">Weekly Period Allocation</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className={`badge ${isOver ? 'bg-danger' : 'bg-success'} rounded-pill`}>
            {allocated} / {total} periods
          </span>
          {isOver ? (
            <span className="small text-danger fw-semibold">
              {Math.abs(available ?? 0)} over limit!
            </span>
          ) : (
            <span className="small text-muted">
              {available} remaining
            </span>
          )}
        </div>
      </div>

      <div className="progress" style={{ height: 8, borderRadius: 4 }}>
        <div
          className={`progress-bar ${barColor}`}
          role="progressbar"
          style={{ width: `${pct}%`, borderRadius: 4 }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {isOver && (
        <div className="mt-2 small text-danger">
          This class section has exceeded its total weekly slots. Remove or reduce some requirements.
        </div>
      )}
    </div>
  )
}
