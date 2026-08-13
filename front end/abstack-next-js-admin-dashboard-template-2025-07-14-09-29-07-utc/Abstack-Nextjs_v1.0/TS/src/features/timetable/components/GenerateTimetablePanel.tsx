'use client'
import React, { useEffect, useState } from 'react'
import { Zap, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useGenerateTimetable } from '../hooks/useGenerateTimetable'
import { useTimetableRecord } from '../hooks/useTimetableRecord'
import { ConflictPanel } from './ConflictPanel'
import type { GenerationResult } from '../types'

interface Props {
  // Controlled by the page — previously this panel kept its own independent year state that
  // only coincidentally matched the class selector's year by shared default. Generating for a
  // different year than what's on screen produced no error, just silent confusion.
  academicYear: string
  onAcademicYearChange: (year: string) => void
  // Re-synced (not fully controlled) whenever the selected class section changes, so "select a
  // class, then generate" scopes to that class's grade by default — still freely overridable.
  initialGradeId?: number | null
}

export function GenerateTimetablePanel({ academicYear, onAcademicYearChange, initialGradeId }: Props) {
  const [gradeFilter, setGradeFilter] = useState('')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setGradeFilter(initialGradeId ? String(initialGradeId) : '')
  }, [initialGradeId])

  const generate = useGenerateTimetable()
  const trimmedYear = academicYear.trim()
  const { data: record } = useTimetableRecord(trimmedYear || null)
  const isFinalized = !!record?.isLocked

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

        {isFinalized && (
          <div className="alert alert-warning py-2 small mb-3 d-flex align-items-center gap-2">
            <AlertTriangle size={15} className="flex-shrink-0" />
            This timetable is finalized — unlock it first to regenerate.
          </div>
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
              onChange={(e) => onAcademicYearChange(e.target.value)}
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
            disabled={generate.isPending || !trimmedYear || isFinalized}
            title={isFinalized ? 'This timetable is finalized — unlock it first to regenerate.' : undefined}
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

            {result.skippedSections.length > 0 && (
              <div className="alert alert-secondary py-2 small mt-3 mb-0">
                <div className="fw-semibold mb-1">
                  {result.skippedSections.length} section{result.skippedSections.length !== 1 ? 's' : ''} skipped — existing schedule preserved:
                </div>
                <ul className="mb-0 ps-3">
                  {result.skippedSections.map((s) => (
                    <li key={s.classSectionId}>
                      {s.gradeName} · Section {s.name} — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
