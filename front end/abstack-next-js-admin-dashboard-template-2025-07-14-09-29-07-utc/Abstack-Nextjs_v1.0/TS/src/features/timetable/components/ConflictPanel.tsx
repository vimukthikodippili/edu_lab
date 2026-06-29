'use client'
import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import type { ConflictRecord } from '../types'

interface Props {
  conflicts: ConflictRecord[]
}

export function ConflictPanel({ conflicts }: Props) {
  const [expanded, setExpanded] = useState(true)

  if (conflicts.length === 0) return null

  return (
    <div
      className="rounded-3 border mb-4"
      style={{ borderColor: '#ffc107', background: '#fffdf0' }}
    >
      {/* Header */}
      <button
        type="button"
        className="w-100 d-flex align-items-center justify-content-between px-4 py-3 border-0 bg-transparent"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="d-flex align-items-center gap-2">
          <AlertTriangle size={16} style={{ color: '#d97706' }} />
          <span className="fw-semibold small" style={{ color: '#92400e' }}>
            {conflicts.length} requirement{conflicts.length !== 1 ? 's' : ''} could not be fully scheduled
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} style={{ color: '#92400e' }} />
        ) : (
          <ChevronDown size={14} style={{ color: '#92400e' }} />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <div className="d-flex flex-column gap-2">
            {conflicts.map((c, i) => (
              <div
                key={i}
                className="d-flex align-items-center justify-content-between rounded-2 px-3 py-2"
                style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
              >
                <div>
                  <div className="small fw-semibold" style={{ color: '#78350f' }}>
                    {c.classSection.gradeName} · Section {c.classSection.name}
                    <span className="fw-normal text-muted ms-1">—</span>
                    <span className="ms-1">{c.subject.code}: {c.subject.name}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                    Teacher: {c.teacher.name}
                  </div>
                </div>
                <div className="text-end" style={{ minWidth: 140 }}>
                  <span className="badge bg-warning text-dark me-1">
                    needed {c.requested}
                  </span>
                  <span className="badge bg-success text-white me-1">
                    placed {c.assigned}
                  </span>
                  {c.unassigned > 0 && (
                    <span className="badge bg-danger text-white">
                      {c.unassigned} unassigned
                    </span>
                  )}
                  {c.unassigned === 0 && (
                    <CheckCircle2 size={14} className="text-success ms-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="small text-muted mt-2 mb-0">
            These periods were partially or fully unscheduled due to teacher or class-section conflicts.
            Resolve by manually swapping entries or reducing period requirements.
          </p>
        </div>
      )}
    </div>
  )
}
