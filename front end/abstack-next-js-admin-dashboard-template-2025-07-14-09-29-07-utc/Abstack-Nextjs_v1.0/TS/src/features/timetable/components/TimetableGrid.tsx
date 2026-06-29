'use client'
import React, { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import type { TimetableEntry } from '../types'
import { DAY_LABELS } from '../types'
import { useUpdateTimetableEntry } from '../hooks/useUpdateTimetableEntry'
import { useDeleteTimetableEntry } from '../hooks/useDeleteTimetableEntry'

// ─── Subject color palette by category name ──────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  science:     { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
  mathematics: { bg: '#fdf4ff', text: '#6b21a8', border: '#e9d5ff' },
  language:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  religion:    { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  aesthetics:  { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  technology:  { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  commerce:    { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  default:     { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' },
}

function getCategoryColor(categoryName = '') {
  const key = categoryName.toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v
  }
  return CATEGORY_COLORS.default
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditEntryModal({
  entry,
  maxDay,
  maxPeriod,
  onClose,
}: {
  entry: TimetableEntry
  maxDay: number
  maxPeriod: number
  onClose: () => void
}) {
  const [day, setDay] = useState(entry.day)
  const [period, setPeriod] = useState(entry.period)
  const [room, setRoom] = useState(entry.roomNumber ?? '')
  const [err, setErr] = useState('')
  const update = useUpdateTimetableEntry()
  const del = useDeleteTimetableEntry()

  const handleSave = async () => {
    setErr('')
    try {
      await update.mutateAsync({ id: entry.id, day, period, roomNumber: room || null })
      onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to save.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remove this timetable entry?')) return
    try {
      await del.mutateAsync(entry.id)
      onClose()
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to delete.')
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1055, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered mb-0" style={{ maxWidth: 400, width: '95%' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div
            className="d-flex align-items-center justify-content-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <span className="fw-bold text-white small">Edit Timetable Entry</span>
            <button className="btn-close btn-close-white btn-sm" onClick={onClose} />
          </div>

          <div className="px-4 py-3 d-flex flex-column gap-3">
            {err && <div className="alert alert-danger py-2 small mb-0">{err}</div>}

            <div className="rounded-2 px-3 py-2 small" style={{ background: '#f0f2ff', border: '1px solid #c7d2fe' }}>
              <div className="fw-semibold" style={{ color: '#4338ca' }}>
                {entry.subject.code}: {entry.subject.name}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                {entry.teacher.firstName} {entry.teacher.lastName} · {entry.classSection.grade.name} · {entry.classSection.name}
              </div>
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small fw-semibold mb-1">Day</label>
                <select className="form-select form-select-sm" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d] ?? `Day ${d}`}</option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold mb-1">Period</label>
                <select className="form-select form-select-sm" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                  {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>Period {p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label small fw-semibold mb-1">
                Room <span className="text-muted fw-normal">(optional)</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Room 12"
                maxLength={20}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between px-4 pb-4 pt-0">
            <button
              className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
              disabled={del.isPending}
              onClick={handleDelete}
            >
              {del.isPending ? <span className="spinner-border spinner-border-sm" /> : <Trash2 size={12} />}
              Remove
            </button>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                disabled={update.isPending}
                onClick={handleSave}
              >
                {update.isPending ? <span className="spinner-border spinner-border-sm" /> : <Check size={12} />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Grid cell ────────────────────────────────────────────────────────────────

function GridCell({
  entry,
  maxDay,
  maxPeriod,
  canEdit,
}: {
  entry: TimetableEntry | undefined
  maxDay: number
  maxPeriod: number
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (!entry) {
    return (
      <td
        style={{
          minWidth: 100,
          height: 64,
          border: '1px dashed #e2e8f0',
          verticalAlign: 'middle',
          textAlign: 'center',
          color: '#cbd5e1',
          fontSize: '0.75rem',
        }}
      >
        —
      </td>
    )
  }

  const colors = getCategoryColor(entry.subject.category?.name)

  return (
    <>
      {editing && (
        <EditEntryModal
          entry={entry}
          maxDay={maxDay}
          maxPeriod={maxPeriod}
          onClose={() => setEditing(false)}
        />
      )}
      <td
        style={{
          minWidth: 110,
          height: 64,
          border: `1px solid ${colors.border}`,
          background: colors.bg,
          verticalAlign: 'middle',
          padding: '4px 8px',
          cursor: canEdit ? 'pointer' : 'default',
          transition: 'filter 0.15s',
        }}
        onClick={() => canEdit && setEditing(true)}
        title={canEdit ? 'Click to edit' : undefined}
      >
        <div className="fw-semibold" style={{ fontSize: '0.72rem', color: colors.text, lineHeight: 1.2 }}>
          {entry.subject.code}
        </div>
        <div style={{ fontSize: '0.68rem', color: colors.text, opacity: 0.85, lineHeight: 1.2, marginTop: 1 }}>
          {entry.subject.name.length > 14 ? entry.subject.name.slice(0, 13) + '…' : entry.subject.name}
        </div>
        <div className="text-muted" style={{ fontSize: '0.63rem', marginTop: 2 }}>
          {entry.teacher.firstName[0]}. {entry.teacher.lastName}
          {entry.roomNumber && <span className="ms-1 opacity-75">· {entry.roomNumber}</span>}
        </div>
      </td>
    </>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

interface Props {
  entries: TimetableEntry[]
  isLoading: boolean
  canEdit?: boolean
}

export function TimetableGrid({ entries, isLoading, canEdit = false }: Props) {
  if (isLoading) {
    return (
      <div className="p-3 placeholder-glow">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="placeholder col-12 rounded d-block mb-2" style={{ height: 48 }} />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p className="small mb-0">No timetable entries for this selection.</p>
        <p className="small">Generate a timetable first or select a different class/teacher.</p>
      </div>
    )
  }

  // Determine grid dimensions from entries
  const maxDay = Math.max(...entries.map((e) => e.day), 5)
  const maxPeriod = Math.max(...entries.map((e) => e.period), 8)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  // Build lookup map
  const entryMap = new Map<string, TimetableEntry>()
  for (const e of entries) entryMap.set(`${e.day}-${e.period}`, e)

  return (
    <div className="table-responsive" style={{ maxHeight: 520, overflowY: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 3,
                background: '#f8fafc',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b',
                border: '1px solid #e2e8f0',
                minWidth: 72,
              }}
            >
              Period
            </th>
            {days.map((d) => (
              <th
                key={d}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '6px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#fff',
                  border: '1px solid #5a6fd6',
                  textAlign: 'center',
                  minWidth: 110,
                }}
              >
                {DAY_LABELS[d] ?? `Day ${d}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  background: '#f8fafc',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                P{p}
              </td>
              {days.map((d) => (
                <GridCell
                  key={d}
                  entry={entryMap.get(`${d}-${p}`)}
                  maxDay={maxDay}
                  maxPeriod={maxPeriod}
                  canEdit={canEdit}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
