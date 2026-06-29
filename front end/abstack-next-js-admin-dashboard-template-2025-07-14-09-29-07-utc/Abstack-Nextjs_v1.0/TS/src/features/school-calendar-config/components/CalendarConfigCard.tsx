'use client'
import React, { useState, useEffect } from 'react'
import { CalendarDays, Clock, Zap } from 'lucide-react'
import { useUpsertCalendarConfig } from '../hooks/useUpsertCalendarConfig'
import type { GradeStage, SchoolCalendarConfig } from '../types'

const STAGE_META: Record<
  GradeStage,
  { label: string; grades: string; gradient: string; icon: string }
> = {
  primary: {
    label: 'Primary',
    grades: 'Grades 1–5',
    gradient: 'linear-gradient(135deg, #20c997 0%, #0ca678 100%)',
    icon: '🎒',
  },
  junior_secondary: {
    label: 'Junior Secondary',
    grades: 'Grades 6–9',
    gradient: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
    icon: '📚',
  },
  senior_secondary: {
    label: 'Senior Secondary',
    grades: 'Grades 10–11',
    gradient: 'linear-gradient(135deg, #6f42c1 0%, #4e2d89 100%)',
    icon: '🔬',
  },
  collegiate: {
    label: 'Collegiate (A/L)',
    grades: 'Grades 12–13',
    gradient: 'linear-gradient(135deg, #fd7e14 0%, #e05d00 100%)',
    icon: '🏆',
  },
}

interface Props {
  config: SchoolCalendarConfig
}

export function CalendarConfigCard({ config }: Props) {
  const meta = STAGE_META[config.gradeStage as GradeStage]

  const [days, setDays] = useState(config.workingDaysPerWeek)
  const [periods, setPeriods] = useState(config.periodsPerDay)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Reset local state when the server data refreshes
  useEffect(() => {
    setDays(config.workingDaysPerWeek)
    setPeriods(config.periodsPerDay)
  }, [config.workingDaysPerWeek, config.periodsPerDay])

  // Live computation — no API call needed
  const totalSlots = days * periods
  const isUnchanged =
    days === config.workingDaysPerWeek && periods === config.periodsPerDay

  const upsert = useUpsertCalendarConfig(config.gradeStage as GradeStage)

  const handleSave = async () => {
    setErrorMsg('')
    try {
      await upsert.mutateAsync({ workingDaysPerWeek: days, periodsPerDay: periods })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        (Array.isArray(err?.response?.data?.errors)
          ? err.response.data.errors.join(', ')
          : 'Failed to save. Please try again.')
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
  }

  return (
    <div className="card border-0 shadow-sm h-100">
      {/* Gradient header */}
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3"
        style={{ background: meta.gradient }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="text-white">
            <div className="fw-bold fs-6">
              {meta.icon} {meta.label}
            </div>
            <div className="small opacity-75">{meta.grades}</div>
          </div>
          {saved && (
            <span className="badge bg-white text-success fw-semibold">
              Saved ✓
            </span>
          )}
        </div>
      </div>

      <div className="card-body px-4 py-3 d-flex flex-column gap-3">
        {/* Error alert */}
        {errorMsg && (
          <div className="alert alert-danger py-2 small mb-0">{errorMsg}</div>
        )}

        {/* Working days */}
        <div>
          <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1 mb-1">
            <CalendarDays size={13} />
            Working Days / Week
          </label>
          <select
            className="form-select form-select-sm"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value))
              setErrorMsg('')
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? 'day' : 'days'}{d === 5 ? ' (Mon–Fri)' : d === 6 ? ' (Mon–Sat)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Periods per day */}
        <div>
          <label className="form-label small fw-semibold text-muted d-flex align-items-center gap-1 mb-1">
            <Clock size={13} />
            Periods / Day
          </label>
          <input
            type="number"
            className="form-control form-control-sm"
            min={1}
            max={20}
            value={periods}
            onChange={(e) => {
              const v = Math.max(1, Math.min(20, Number(e.target.value)))
              setPeriods(v)
              setErrorMsg('')
            }}
          />
        </div>

        {/* Live total weekly slots */}
        <div
          className="rounded-2 d-flex align-items-center justify-content-between px-3 py-2"
          style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '1px solid #dee2e6' }}
        >
          <div className="d-flex align-items-center gap-2 small text-muted fw-semibold">
            <Zap size={14} style={{ color: '#fd7e14' }} />
            Total Weekly Slots
          </div>
          <span
            className="badge rounded-pill fw-bold fs-6"
            style={{ background: meta.gradient, minWidth: 64, textAlign: 'center' }}
          >
            {totalSlots}
          </span>
          <span className="small text-muted">periods/week</span>
        </div>

        {/* Save button */}
        <div className="d-flex justify-content-end mt-auto pt-1">
          <button
            className="btn btn-sm btn-primary d-flex align-items-center gap-2"
            disabled={isUnchanged || upsert.isPending}
            onClick={handleSave}
          >
            {upsert.isPending && (
              <span className="spinner-border spinner-border-sm" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
