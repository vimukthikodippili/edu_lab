'use client'
import React, { useState } from 'react'
import { Zap, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useGenerateTimetable } from '../hooks/useGenerateTimetable'
import { ConflictPanel } from './ConflictPanel'
import type { GenerationResult } from '../types'

const CURRENT_YEAR = String(new Date().getFullYear())

export function GenerateTimetablePanel() {
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [gradeFilter, setGradeFilter] = useState('')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const generate = useGenerateTimetable()

  const handleGenerate = async () => {
    setErrorMsg('')
    setResult(null)
    try {
      const res = await generate.mutateAsync({
        academicYear: academicYear.trim(),
        ...(gradeFilter ? { gradeId: Number(gradeFilter) } : {}),
      })
      setResult(res)
    } catch (err: any) {
      const raw = err?.response?.data?.errors?.academicYear ?? err?.response?.data?.message ?? 'Generation failed.'
      setErrorMsg(typeof raw === 'string' ? raw : JSON.stringify(raw))
    }
  }

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="d-flex align-items-center gap-2">
          <Zap size={16} className="text-white" />
          <span className="fw-bold text-white">Auto-Generate Timetable</span>
        </div>
      </div>

      <div className="card-body px-4 py-3">
        {errorMsg && (
          <div className="alert alert-danger py-2 small mb-3">{errorMsg}</div>
        )}

        {/* Controls row */}
        <div className="d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label className="form-label small fw-semibold mb-1">Academic Year</label>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 90 }}
              placeholder="2026"
              maxLength={4}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label small fw-semibold mb-1">
              Grade
              <span className="text-muted fw-normal ms-1">(optional)</span>
            </label>
            <select
              className="form-select form-select-sm"
              style={{ width: 130 }}
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="">All grades</option>
              {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-sm btn-primary d-flex align-items-center gap-2 mb-1"
            disabled={generate.isPending || !academicYear.trim()}
            onClick={handleGenerate}
          >
            {generate.isPending ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <Zap size={13} />
            )}
            {generate.isPending ? 'Generating…' : 'Generate Timetable'}
          </button>
        </div>

        {/* Result summary */}
        {result && (
          <div className="mt-3">
            <div
              className="d-flex align-items-center gap-3 flex-wrap rounded-2 px-3 py-2"
              style={{
                background: result.conflictsCount === 0 ? '#f0fdf4' : '#fffbeb',
                border: `1px solid ${result.conflictsCount === 0 ? '#bbf7d0' : '#fde68a'}`,
              }}
            >
              {result.conflictsCount === 0 ? (
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
              ) : (
                <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
              )}
              <div className="small">
                <span className="fw-semibold" style={{ color: result.conflictsCount === 0 ? '#166534' : '#92400e' }}>
                  {result.entriesCreated} entries created
                </span>
                <span className="text-muted ms-2">for {result.academicYear}</span>
                <span className="text-muted ms-2">·</span>
                <span className="text-muted ms-2">{result.durationMs}ms</span>
                {result.conflictsCount > 0 && (
                  <span className="ms-2 text-warning fw-semibold">
                    · {result.conflictsCount} conflict{result.conflictsCount !== 1 ? 's' : ''} below
                  </span>
                )}
              </div>
            </div>

            {result.conflicts.length > 0 && (
              <div className="mt-3">
                <ConflictPanel conflicts={result.conflicts} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
