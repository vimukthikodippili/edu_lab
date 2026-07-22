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
import { Layers, GripVertical, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useGradeStages } from '@/features/grade-stages/hooks/useGradeStages'
import { useCreateGradeStage } from '@/features/grade-stages/hooks/useCreateGradeStage'
import { useUpdateGradeStage } from '@/features/grade-stages/hooks/useUpdateGradeStage'
import { useDeleteGradeStage } from '@/features/grade-stages/hooks/useDeleteGradeStage'
import { useReorderGradeStages } from '@/features/grade-stages/hooks/useReorderGradeStages'
import type { GradeStage } from '@/features/grade-stages/types'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableStageRow({
  stage,
  onSave,
  onDelete,
}: {
  stage: GradeStage
  onSave: (id: string, values: { stageName: string; fromGrade: number; toGrade: number }) => void
  onDelete: (stage: GradeStage) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(stage.stageName)
  const [fromGrade, setFromGrade] = useState(stage.fromGrade)
  const [toGrade, setToGrade] = useState(stage.toGrade)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setName(stage.stageName)
    setFromGrade(stage.fromGrade)
    setToGrade(stage.toGrade)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const commitEdit = () => {
    const trimmed = name.trim()
    if (trimmed && (trimmed !== stage.stageName || fromGrade !== stage.fromGrade || toGrade !== stage.toGrade)) {
      onSave(stage.id, { stageName: trimmed, fromGrade, toGrade })
    }
    setEditing(false)
  }

  const cancelEdit = () => setEditing(false)

  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom flex-wrap">
      <span
        {...attributes}
        {...listeners}
        className="text-muted"
        style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </span>

      {editing ? (
        <div className="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
          <input
            ref={inputRef}
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 220 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
          <span className="small text-muted">Grades</span>
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 70 }}
            min={1}
            max={13}
            value={fromGrade}
            onChange={(e) => setFromGrade(Number(e.target.value))}
          />
          <span className="small text-muted">–</span>
          <input
            type="number"
            className="form-control form-control-sm"
            style={{ width: 70 }}
            min={1}
            max={13}
            value={toGrade}
            onChange={(e) => setToGrade(Number(e.target.value))}
          />
          <button type="button" className="btn btn-success btn-sm px-2" onClick={commitEdit}>
            <Check size={13} />
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm px-2" onClick={cancelEdit}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-grow-1 small fw-medium">{stage.stageName}</span>
          <span className="badge bg-secondary bg-opacity-15 text-secondary" style={{ minWidth: 110, textAlign: 'center' }}>
            {stage.fromGrade === stage.toGrade ? `Grade ${stage.fromGrade}` : `Grades ${stage.fromGrade}–${stage.toGrade}`}
          </span>
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <button type="button" className="btn btn-link btn-sm p-1 text-secondary" title="Edit" onClick={startEdit}>
              <Pencil size={14} />
            </button>
            <button type="button" className="btn btn-link btn-sm p-1 text-danger" title="Delete stage" onClick={() => onDelete(stage)}>
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Delete confirm row ─────────────────────────────────────────────────────

function DeleteConfirmRow({
  stage,
  onConfirm,
  onCancel,
  isPending,
}: {
  stage: GradeStage
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-danger bg-opacity-5">
      <span className="small text-danger flex-grow-1">
        Delete <strong>&ldquo;{stage.stageName}&rdquo;</strong>? Blocked if any student or class
        section is currently in Grades {stage.fromGrade}–{stage.toGrade}.
      </span>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={onConfirm}>
        {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Delete'}
      </button>
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={isPending} onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function GradeStagesPage() {
  const { showNotification } = useNotificationContext()

  const [localOrder, setLocalOrder] = useState<GradeStage[] | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [addName, setAddName] = useState('')
  const [addFrom, setAddFrom] = useState(1)
  const [addTo, setAddTo] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<GradeStage | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const { data: stages, isLoading, isFetching } = useGradeStages()

  React.useEffect(() => {
    if (stages) setLocalOrder(stages)
  }, [stages])

  const displayStages = localOrder ?? stages ?? []

  const createMutation = useCreateGradeStage()
  const updateMutation = useUpdateGradeStage()
  const deleteMutation = useDeleteGradeStage()
  const reorderMutation = useReorderGradeStages()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !displayStages.length) return

    const oldIndex = displayStages.findIndex((s) => s.id === active.id)
    const newIndex = displayStages.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(displayStages, oldIndex, newIndex)
    setLocalOrder(reordered)

    reorderMutation.mutate(
      { orderedIds: reordered.map((s) => s.id) },
      {
        onError: (err) => {
          setLocalOrder(displayStages)
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  const handleSaveStage = (id: string, values: { stageName: string; fromGrade: number; toGrade: number }) => {
    updateMutation.mutate(
      { id, payload: values },
      {
        onSuccess: (result) => {
          showNotification({ variant: 'success', message: 'Grade stage updated.' })
          setWarnings(result.warnings ?? [])
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleAddStage = () => {
    const stageName = addName.trim()
    if (!stageName) {
      showNotification({ variant: 'warning', message: 'Stage name cannot be empty.' })
      return
    }
    createMutation.mutate(
      { stageName, fromGrade: addFrom, toGrade: addTo },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Grade stage added.' })
          setAddName('')
          setAddFrom(1)
          setAddTo(1)
          setShowAddRow(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Grade stage deleted.' })
        setPendingDelete(null)
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        setPendingDelete(null)
      },
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <Layers size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Grade Stages</h4>
            <p className="text-muted small mb-0">
              Define how grades group into stages (Primary, Junior Secondary, …) — used by
              calendar config, timetable generation, and attendance rules
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center gap-1"
          style={{ background: '#667eea', color: '#fff' }}
          onClick={() => { setShowAddRow(true); setAddName(''); setAddFrom(1); setAddTo(1) }}
          disabled={isLoading}
        >
          + Add Stage
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="alert alert-warning d-flex align-items-start gap-2 py-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
          <div className="small">
            {warnings.map((w, i) => <div key={i}>{w}</div>)}
          </div>
          <button type="button" className="btn-close btn-sm ms-auto" onClick={() => setWarnings([])} />
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
          <span className="fw-semibold">
            {isLoading ? 'Loading…' : `${displayStages.length} Stage${displayStages.length !== 1 ? 's' : ''}`}
            {isFetching && !isLoading && <span className="spinner-border spinner-border-sm ms-2" />}
          </span>
        </div>

        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
            ))}
          </div>
        )}

        {showAddRow && (
          <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-success bg-opacity-5 flex-wrap">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: 220 }}
              placeholder="Stage name (e.g. Primary)"
              value={addName}
              maxLength={120}
              autoFocus
              onChange={(e) => setAddName(e.target.value)}
            />
            <span className="small text-muted">Grades</span>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: 70 }}
              min={1}
              max={13}
              value={addFrom}
              onChange={(e) => setAddFrom(Number(e.target.value))}
            />
            <span className="small text-muted">–</span>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: 70 }}
              min={1}
              max={13}
              value={addTo}
              onChange={(e) => setAddTo(Number(e.target.value))}
            />
            <button
              type="button"
              className="btn btn-success btn-sm d-flex align-items-center gap-1"
              disabled={createMutation.isPending}
              onClick={handleAddStage}
            >
              {createMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <Check size={13} />}
              Save
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={createMutation.isPending}
              onClick={() => setShowAddRow(false)}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {!isLoading && displayStages.length === 0 && !showAddRow && (
          <div className="text-center text-muted py-5">No grade stages configured yet.</div>
        )}

        {!isLoading && displayStages.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {displayStages.map((stage) =>
                pendingDelete?.id === stage.id ? (
                  <DeleteConfirmRow
                    key={stage.id}
                    stage={stage}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setPendingDelete(null)}
                    isPending={deleteMutation.isPending}
                  />
                ) : (
                  <SortableStageRow
                    key={stage.id}
                    stage={stage}
                    onSave={handleSaveStage}
                    onDelete={(s) => setPendingDelete(s)}
                  />
                ),
              )}
            </SortableContext>
          </DndContext>
        )}

        {!isLoading && displayStages.length > 0 && (
          <div className="card-footer bg-white border-top text-muted small py-2 px-3">
            <GripVertical size={12} className="me-1" />
            Drag rows to reorder · Click the pencil to edit a stage&apos;s name or grade range
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminGradeStagesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <GradeStagesPage />
    </RoleGuard>
  )
}
