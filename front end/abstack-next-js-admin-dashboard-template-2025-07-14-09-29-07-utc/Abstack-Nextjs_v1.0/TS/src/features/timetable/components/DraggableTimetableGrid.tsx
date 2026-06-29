'use client'
import React, { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical, Check, Lock, Trash2 } from 'lucide-react'
import type { TimetableEntry } from '../types'
import { DAY_LABELS } from '../types'
import { useUpdateTimetableEntry } from '../hooks/useUpdateTimetableEntry'
import { useDeleteTimetableEntry } from '../hooks/useDeleteTimetableEntry'
import { detectConflict } from '../utils/detectConflict'
import { useNotificationContext } from '@/context/useNotificationContext'

// ─── Color palette (mirrors TimetableGrid) ───────────────────────────────────

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

// ─── Edit entry modal ────────────────────────────────────────────────────────

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

// ─── Entry card (renders in grid and in DragOverlay) ─────────────────────────

function EntryCard({
  entry,
  ghost = false,
  isOverlay = false,
}: {
  entry: TimetableEntry
  ghost?: boolean
  isOverlay?: boolean
}) {
  const colors = getCategoryColor(entry.subject.category?.name)

  return (
    <div
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 6,
        padding: '4px 6px 4px 4px',
        height: '100%',
        opacity: ghost ? 0.3 : 1,
        boxShadow: isOverlay
          ? '0 10px 28px rgba(102,126,234,0.28), 0 3px 10px rgba(0,0,0,0.14)'
          : 'none',
        transform: isOverlay ? 'rotate(1.5deg) scale(1.04)' : 'none',
        transition: isOverlay ? 'none' : 'opacity 0.15s',
        cursor: isOverlay ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 3,
        overflow: 'hidden',
      }}
    >
      <GripVertical size={10} style={{ color: colors.border, flexShrink: 0, marginTop: 3, opacity: 0.8 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>
          {entry.subject.code}
        </div>
        <div style={{ fontSize: '0.67rem', color: colors.text, opacity: 0.85, lineHeight: 1.2, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.subject.name}
        </div>
        <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.teacher.firstName[0]}. {entry.teacher.lastName}
          {entry.roomNumber && <span style={{ marginLeft: 4, opacity: 0.7 }}>· {entry.roomNumber}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Draggable entry wrapper ──────────────────────────────────────────────────

function DraggableEntry({
  entry,
  isActivelyDragged,
  maxDay,
  maxPeriod,
}: {
  entry: TimetableEntry
  isActivelyDragged: boolean
  maxDay: number
  maxPeriod: number
}) {
  const [editing, setEditing] = useState(false)
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: String(entry.id),
    data: { entry },
  })

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
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        onClick={() => setEditing(true)}
        title="Drag to move · Click to edit"
      >
        <EntryCard entry={entry} ghost={isActivelyDragged} />
      </div>
    </>
  )
}

// ─── Droppable cell wrapper ───────────────────────────────────────────────────

function DroppableCell({
  day,
  period,
  children,
}: {
  day: number
  period: number
  children?: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${day}-${period}`,
    data: { day, period },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: day + 1,
        gridRow: period + 1,
        border: isOver ? '2px solid #667eea' : '1px dashed #e2e8f0',
        background: isOver ? '#f0f2ff' : 'transparent',
        borderRadius: isOver ? 6 : 0,
        transition: 'border-color 0.1s, background 0.1s',
        display: 'flex',
        alignItems: 'stretch',
        padding: 4,
        minWidth: 0,
        minHeight: 0,
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

interface Props {
  entries: TimetableEntry[]
  isLoading: boolean
  isLocked?: boolean
}

export function DraggableTimetableGrid({ entries, isLoading, isLocked = false }: Props) {
  const { showNotification } = useNotificationContext()
  const update = useUpdateTimetableEntry()
  const [activeEntry, setActiveEntry] = useState<TimetableEntry | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isLocked ? { distance: 999999 } : { distance: 8 },
    }),
  )

  const onDragStart = useCallback((event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as TimetableEntry | undefined
    setActiveEntry(entry ?? null)
  }, [])

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveEntry(null)
      const { active, over } = event
      if (!over) return

      const movingId = Number(active.id)
      const targetDay = over.data.current?.day as number | undefined
      const targetPeriod = over.data.current?.period as number | undefined
      if (!targetDay || !targetPeriod) return

      // No-op: dropped on same slot
      const moving = entries.find((e) => e.id === movingId)
      if (moving && moving.day === targetDay && moving.period === targetPeriod) return

      // Client-side same-class slot conflict check
      const conflict = detectConflict(entries, movingId, targetDay, targetPeriod)
      if (conflict) {
        showNotification({
          variant: 'warning',
          title: 'Slot Conflict',
          message: conflict.message,
          delay: 4500,
        })
        return
      }

      try {
        await update.mutateAsync({ id: movingId, day: targetDay, period: targetPeriod })
        showNotification({ variant: 'success', message: 'Period moved successfully.', delay: 2000 })
      } catch (err: any) {
        const msg: string =
          err?.response?.data?.message ?? 'Could not move entry — try again.'
        showNotification({ variant: 'danger', title: 'Cannot Move', message: msg, delay: 4500 })
      }
    },
    [entries, showNotification, update],
  )

  // ── Loading state ──────────────────────────────────────────────────────────

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
        <p className="small">Generate a timetable first or select a different class.</p>
      </div>
    )
  }

  // ── Grid dimensions ────────────────────────────────────────────────────────

  const maxDay = Math.max(...entries.map((e) => e.day), 5)
  const maxPeriod = Math.max(...entries.map((e) => e.period), 8)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  const entryMap = new Map<string, TimetableEntry>()
  for (const e of entries) entryMap.set(`${e.day}-${e.period}`, e)

  // ── Cell sizing ────────────────────────────────────────────────────────────
  const COL_LABEL = 72
  const COL_MIN   = 120
  const ROW_HEAD  = 40
  const ROW_CELL  = 68

  return (
    <div>
      {/* Drag hint / lock notice */}
      <div className="d-flex align-items-center gap-2 px-1 pb-2">
        {isLocked ? (
          <>
            <Lock size={12} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.7rem', color: '#16a34a' }}>
              Timetable finalized — contact admin to unlock before editing
            </span>
          </>
        ) : (
          <>
            <GripVertical size={12} className="text-muted opacity-50" />
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Drag to move a period · Click to edit room or exact slot
            </span>
          </>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 500,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
          }}
        >
          {/* CSS Grid layout — avoids <table> DOM constraints for DragOverlay portal */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `${COL_LABEL}px repeat(${maxDay}, minmax(${COL_MIN}px, 1fr))`,
              gridTemplateRows: `${ROW_HEAD}px repeat(${maxPeriod}, ${ROW_CELL}px)`,
              minWidth: COL_LABEL + maxDay * COL_MIN,
            }}
          >
            {/* Corner cell */}
            <div
              style={{
                gridColumn: 1,
                gridRow: 1,
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 4,
                background: '#f8fafc',
                borderRight: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              Period
            </div>

            {/* Day header row */}
            {days.map((d) => (
              <div
                key={`hd-${d}`}
                style={{
                  gridColumn: d + 1,
                  gridRow: 1,
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRight: d < maxDay ? '1px solid #5a6fd6' : 'none',
                  borderBottom: '1px solid #5a6fd6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.03em',
                }}
              >
                {DAY_LABELS[d] ?? `Day ${d}`}
              </div>
            ))}

            {/* Period label column */}
            {periods.map((p) => (
              <div
                key={`pl-${p}`}
                style={{
                  gridColumn: 1,
                  gridRow: p + 1,
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  background: '#f8fafc',
                  borderRight: '1px solid #e2e8f0',
                  borderBottom: p < maxPeriod ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                P{p}
              </div>
            ))}

            {/* Data cells */}
            {periods.map((p) =>
              days.map((d) => {
                const entry = entryMap.get(`${d}-${p}`)
                return (
                  <DroppableCell key={`${d}-${p}`} day={d} period={p}>
                    {entry ? (
                      <DraggableEntry
                        entry={entry}
                        isActivelyDragged={activeEntry?.id === entry.id}
                        maxDay={maxDay}
                        maxPeriod={maxPeriod}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#e2e8f0',
                          fontSize: '0.8rem',
                          pointerEvents: 'none',
                        }}
                      >
                        —
                      </div>
                    )}
                  </DroppableCell>
                )
              }),
            )}
          </div>
        </div>

        {/* Floating drag overlay */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeEntry && (
            <div style={{ width: COL_MIN - 8, height: ROW_CELL - 8 }}>
              <EntryCard entry={activeEntry} isOverlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
