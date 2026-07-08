'use client'
import React, { useState, useRef } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BookOpen, GripVertical, Pencil, Trash2, X, Check, Copy } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useSyllabusUnits } from '@/features/syllabus/hooks/useSyllabusUnits'
import { useCreateSyllabusUnit } from '@/features/syllabus/hooks/useCreateSyllabusUnit'
import { useUpdateSyllabusUnit } from '@/features/syllabus/hooks/useUpdateSyllabusUnit'
import { useDeleteSyllabusUnit } from '@/features/syllabus/hooks/useDeleteSyllabusUnit'
import { useReorderSyllabusUnits } from '@/features/syllabus/hooks/useReorderSyllabusUnits'
import { useCopyFromYear } from '@/features/syllabus/hooks/useCopyFromYear'
import type { SyllabusUnit } from '@/features/syllabus/types'

const CURRENT_YEAR = String(new Date().getFullYear())

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) {
    return Object.values(data.errors).join('; ')
  }
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

const GRADE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 1)

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableUnitRow({
  unit,
  onSaveTitle,
  onDelete,
}: {
  unit: SyllabusUnit
  onSaveTitle: (id: string, title: string) => void
  onDelete: (unit: SyllabusUnit) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: unit.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(unit.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditTitle(unit.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const commitEdit = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== unit.title) {
      onSaveTitle(unit.id, trimmed)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditTitle(unit.title)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="text-muted"
        style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </span>

      {/* Order badge */}
      <span
        className="badge bg-secondary bg-opacity-15 text-secondary fw-semibold"
        style={{ minWidth: 28, fontSize: '0.72rem' }}
      >
        {unit.order}
      </span>

      {/* Title (inline edit) */}
      {editing ? (
        <div className="d-flex align-items-center gap-1 flex-grow-1">
          <input
            ref={inputRef}
            type="text"
            className="form-control form-control-sm"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            onBlur={commitEdit}
            maxLength={255}
          />
          <button
            type="button"
            className="btn btn-success btn-sm px-2"
            onMouseDown={(e) => { e.preventDefault(); commitEdit() }}
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm px-2"
            onMouseDown={(e) => { e.preventDefault(); cancelEdit() }}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <span
          className="flex-grow-1 small fw-medium"
          style={{ cursor: 'text', wordBreak: 'break-word' }}
          title="Click to edit"
          onClick={startEdit}
        >
          {unit.title}
        </span>
      )}

      {/* Actions */}
      {!editing && (
        <div className="d-flex align-items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="btn btn-link btn-sm p-1 text-secondary"
            title="Edit title"
            onClick={startEdit}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="btn btn-link btn-sm p-1 text-danger"
            title="Delete lesson"
            onClick={() => onDelete(unit)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Delete confirm row ───────────────────────────────────────────────────────

function DeleteConfirmRow({
  unit,
  onConfirm,
  onCancel,
  isPending,
}: {
  unit: SyllabusUnit
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-danger bg-opacity-5">
      <span className="small text-danger flex-grow-1">
        Delete <strong>&ldquo;{unit.title}&rdquo;</strong>? This cannot be undone.
      </span>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={isPending}
        onClick={onConfirm}
      >
        {isPending ? (
          <span className="spinner-border spinner-border-sm" />
        ) : (
          'Delete'
        )}
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        disabled={isPending}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}

// ─── Copy from year modal ─────────────────────────────────────────────────────

function CopyModal({
  subjectId,
  gradeId,
  targetYear,
  onClose,
}: {
  subjectId: string
  gradeId: number
  targetYear: string
  onClose: () => void
}) {
  const { showNotification } = useNotificationContext()
  const [sourceYear, setSourceYear] = useState(String(Number(targetYear) - 1))
  const copyMutation = useCopyFromYear()

  const handleCopy = () => {
    copyMutation.mutate(
      { subjectId, gradeId, sourceYear, targetYear },
      {
        onSuccess: (result) => {
          showNotification({
            variant: 'success',
            message: `${result.length} lesson(s) copied from ${sourceYear} into ${targetYear}.`,
          })
          onClose()
        },
        onError: (err) => {
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  return (
    <div
      className="modal fade show d-block"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-3">
          <div className="modal-header border-bottom-0 pb-0">
            <h6 className="modal-title fw-bold d-flex align-items-center gap-2">
              <Copy size={16} className="text-primary" />
              Copy Lessons from Prior Year
            </h6>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body pt-3">
            <div
              className="rounded-3 px-3 py-2 mb-3 small"
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
            >
              This will copy all lessons from the source year into <strong>{targetYear}</strong>.
              The operation will fail if <strong>{targetYear}</strong> already has lessons defined.
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold small">Source Year</label>
              <input
                type="text"
                className="form-control"
                value={sourceYear}
                maxLength={4}
                pattern="\d{4}"
                onChange={(e) => setSourceYear(e.target.value)}
                placeholder="e.g. 2025"
              />
            </div>
            <div className="mb-1">
              <label className="form-label fw-semibold small">Target Year</label>
              <input
                type="text"
                className="form-control bg-light"
                value={targetYear}
                readOnly
              />
            </div>
          </div>
          <div className="modal-footer border-top-0">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
              disabled={copyMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-2"
              disabled={copyMutation.isPending || sourceYear.length !== 4 || !/^\d{4}$/.test(sourceYear)}
              onClick={handleCopy}
            >
              {copyMutation.isPending && <span className="spinner-border spinner-border-sm" />}
              Copy Lessons
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function SyllabusUnitsPage() {
  const { showNotification } = useNotificationContext()

  // Filter state
  const [subjectId, setSubjectId] = useState('')
  const [gradeId, setGradeId] = useState<number | ''>('')
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [loaded, setLoaded] = useState(false)

  // Applied filter (only set when "Load Units" is pressed)
  const [filter, setFilter] = useState<{ subjectId: string; gradeId: number; academicYear: string } | null>(null)

  // Local optimistic order for drag
  const [localOrder, setLocalOrder] = useState<SyllabusUnit[] | null>(null)

  // UI state
  const [showAddRow, setShowAddRow] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<SyllabusUnit | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)

  // Subjects for dropdown
  const { data: subjectsData } = useSubjects({ limit: 100 })
  const subjects = subjectsData?.data ?? []

  // Units query
  const {
    data: units,
    isLoading,
    isFetching,
  } = useSyllabusUnits({
    subjectId: filter?.subjectId,
    gradeId: filter?.gradeId,
    academicYear: filter?.academicYear,
  })

  // Sync local order when server data arrives
  React.useEffect(() => {
    if (units) setLocalOrder(units)
  }, [units])

  const displayUnits = localOrder ?? units ?? []

  // Mutations
  const createMutation = useCreateSyllabusUnit()
  const updateMutation = useUpdateSyllabusUnit()
  const deleteMutation = useDeleteSyllabusUnit()
  const reorderMutation = useReorderSyllabusUnits()

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleLoad = () => {
    if (!subjectId || !gradeId || !academicYear.match(/^\d{4}$/)) {
      showNotification({ variant: 'warning', message: 'Please select a subject, grade, and valid year.' })
      return
    }
    setLocalOrder(null)
    setFilter({ subjectId, gradeId: Number(gradeId), academicYear })
    setLoaded(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !displayUnits.length) return

    const oldIndex = displayUnits.findIndex((u) => u.id === active.id)
    const newIndex = displayUnits.findIndex((u) => u.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(displayUnits, oldIndex, newIndex)
    setLocalOrder(reordered)

    reorderMutation.mutate(
      { unitIds: reordered.map((u) => u.id) },
      {
        onError: (err) => {
          setLocalOrder(displayUnits)
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Could not save new order.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const handleSaveTitle = (id: string, title: string) => {
    updateMutation.mutate(
      { id, payload: { title } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Lesson title updated.' }),
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Could not update lesson.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const handleAddLesson = () => {
    const title = addTitle.trim()
    if (!title) {
      showNotification({ variant: 'warning', message: 'Lesson title cannot be empty.' })
      return
    }
    if (!filter) return

    const nextOrder = (displayUnits.length > 0 ? Math.max(...displayUnits.map((u) => u.order)) : 0) + 1
    createMutation.mutate(
      {
        subjectId: filter.subjectId,
        gradeId: filter.gradeId,
        title,
        order: nextOrder,
        academicYear: filter.academicYear,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Lesson added.' })
          setAddTitle('')
          setShowAddRow(false)
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Could not add lesson.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Lesson deleted.' })
        setPendingDelete(null)
      },
      onError: (err) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Could not delete lesson.'
        showNotification({ variant: 'danger', message: msg })
        setPendingDelete(null)
      },
    })
  }

  const selectedSubjectName = subjects.find((s) => s.id === subjectId)?.name ?? ''

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Syllabus Units</h4>
            <p className="text-muted small mb-0">Vishaya Nirdeshaya — define the annual lesson list</p>
          </div>
        </div>

        {filter && (
          <button
            type="button"
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
            onClick={() => setShowCopyModal(true)}
          >
            <Copy size={14} />
            Copy from Prior Year
          </button>
        )}
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4">
              <label className="form-label fw-semibold small mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-sm-3">
              <label className="form-label fw-semibold small mb-1">Grade</label>
              <select
                className="form-select form-select-sm"
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select grade…</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="col-6 col-sm-2">
              <label className="form-label fw-semibold small mb-1">Year</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={academicYear}
                maxLength={4}
                pattern="\d{4}"
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026"
              />
            </div>

            <div className="col-12 col-sm-3">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={!subjectId || !gradeId || academicYear.length !== 4}
                onClick={handleLoad}
              >
                {isFetching && loaded && <span className="spinner-border spinner-border-sm" />}
                Load Units
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Units card (only shown after Load) */}
      {loaded && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
            <span className="fw-semibold">
              {isLoading
                ? 'Loading…'
                : `${displayUnits.length} Lesson${displayUnits.length !== 1 ? 's' : ''} Defined`}
              {filter && selectedSubjectName && (
                <span className="text-muted ms-2 fw-normal small">
                  · {selectedSubjectName} / Grade {filter.gradeId} / {filter.academicYear}
                </span>
              )}
            </span>
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{ background: '#10b981', color: '#fff' }}
              onClick={() => { setShowAddRow(true); setAddTitle('') }}
              disabled={isLoading}
            >
              + Add Lesson
            </button>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <div className="p-3 placeholder-glow">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && displayUnits.length === 0 && !showAddRow && (
            <div className="py-5 text-center text-muted">
              <BookOpen size={40} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No lessons defined yet</p>
              <p className="small mb-3">
                Define the annual lesson plan for this subject/grade, or copy from a prior year.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary me-2"
                onClick={() => setShowAddRow(true)}
              >
                + Add First Lesson
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowCopyModal(true)}
              >
                Copy from Prior Year
              </button>
            </div>
          )}

          {/* Add lesson row */}
          {showAddRow && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-success bg-opacity-5">
              <BookOpen size={15} className="text-success flex-shrink-0" />
              <input
                type="text"
                className="form-control form-control-sm flex-grow-1"
                placeholder="Lesson title…"
                value={addTitle}
                maxLength={255}
                autoFocus
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLesson()
                  if (e.key === 'Escape') { setShowAddRow(false); setAddTitle('') }
                }}
              />
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-1"
                disabled={createMutation.isPending}
                onClick={handleAddLesson}
              >
                {createMutation.isPending
                  ? <span className="spinner-border spinner-border-sm" />
                  : <Check size={13} />}
                Save
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={createMutation.isPending}
                onClick={() => { setShowAddRow(false); setAddTitle('') }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Sortable list */}
          {!isLoading && displayUnits.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayUnits.map((u) => u.id)}
                strategy={verticalListSortingStrategy}
              >
                {displayUnits.map((unit) =>
                  pendingDelete?.id === unit.id ? (
                    <DeleteConfirmRow
                      key={unit.id}
                      unit={unit}
                      onConfirm={handleConfirmDelete}
                      onCancel={() => setPendingDelete(null)}
                      isPending={deleteMutation.isPending}
                    />
                  ) : (
                    <SortableUnitRow
                      key={unit.id}
                      unit={unit}
                      onSaveTitle={handleSaveTitle}
                      onDelete={(u) => setPendingDelete(u)}
                    />
                  ),
                )}
              </SortableContext>
            </DndContext>
          )}

          {/* Hint */}
          {!isLoading && displayUnits.length > 0 && (
            <div className="card-footer bg-white border-top text-muted small py-2 px-3">
              <GripVertical size={12} className="me-1" />
              Drag rows to reorder · Click a title to edit inline
            </div>
          )}
        </div>
      )}

      {/* Copy from year modal */}
      {showCopyModal && filter && (
        <CopyModal
          subjectId={filter.subjectId}
          gradeId={filter.gradeId}
          targetYear={filter.academicYear}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  )
}

// ─── Export with RoleGuard ────────────────────────────────────────────────────

export default function TeacherSyllabusUnits() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SYSTEM_ADMIN, ROLES.SECTION_HEAD]}>
      <SyllabusUnitsPage />
    </RoleGuard>
  )
}
