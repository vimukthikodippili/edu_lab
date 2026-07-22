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
import { ListChecks, GripVertical, Pencil, Archive, X, Check } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useSubjectTopics } from '@/features/subject-topics/hooks/useSubjectTopics'
import { useCreateTopic } from '@/features/subject-topics/hooks/useCreateTopic'
import { useRenameTopic } from '@/features/subject-topics/hooks/useRenameTopic'
import { useArchiveTopic } from '@/features/subject-topics/hooks/useArchiveTopic'
import { useReorderTopics } from '@/features/subject-topics/hooks/useReorderTopics'
import type { SubjectTopic } from '@/features/subject-topics/types'

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableTopicRow({
  topic,
  onSaveTitle,
  onArchive,
}: {
  topic: SubjectTopic
  onSaveTitle: (id: string, title: string) => void
  onArchive: (topic: SubjectTopic) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(topic.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditTitle(topic.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const commitEdit = () => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== topic.title) onSaveTitle(topic.id, trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditTitle(topic.title)
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
      <span
        {...attributes}
        {...listeners}
        className="text-muted"
        style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </span>

      <span
        className="badge bg-secondary bg-opacity-15 text-secondary fw-semibold"
        style={{ minWidth: 28, fontSize: '0.72rem' }}
      >
        {topic.order}
      </span>

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
            maxLength={120}
          />
          <button type="button" className="btn btn-success btn-sm px-2" onMouseDown={(e) => { e.preventDefault(); commitEdit() }}>
            <Check size={13} />
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm px-2" onMouseDown={(e) => { e.preventDefault(); cancelEdit() }}>
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
          {topic.title}
        </span>
      )}

      {!editing && (
        <div className="d-flex align-items-center gap-1 flex-shrink-0">
          <button type="button" className="btn btn-link btn-sm p-1 text-secondary" title="Rename" onClick={startEdit}>
            <Pencil size={14} />
          </button>
          <button type="button" className="btn btn-link btn-sm p-1 text-danger" title="Archive topic" onClick={() => onArchive(topic)}>
            <Archive size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Archive confirm row ──────────────────────────────────────────────────────

function ArchiveConfirmRow({
  topic,
  onConfirm,
  onCancel,
  isPending,
}: {
  topic: SubjectTopic
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-danger bg-opacity-5">
      <span className="small text-danger flex-grow-1">
        Archive <strong>&ldquo;{topic.title}&rdquo;</strong>? It won&apos;t appear in new assessments,
        but stays on any records that already reference it.
      </span>
      <button type="button" className="btn btn-danger btn-sm" disabled={isPending} onClick={onConfirm}>
        {isPending ? <span className="spinner-border spinner-border-sm" /> : 'Archive'}
      </button>
      <button type="button" className="btn btn-outline-secondary btn-sm" disabled={isPending} onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function SubjectTopicsPage() {
  const { showNotification } = useNotificationContext()

  const [subjectId, setSubjectId] = useState('')
  const [localOrder, setLocalOrder] = useState<SubjectTopic[] | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [pendingArchive, setPendingArchive] = useState<SubjectTopic | null>(null)

  const { data: subjectsData } = useSubjects({ limit: 100 })
  const subjects = subjectsData?.data ?? []

  const { data: topics, isLoading, isFetching } = useSubjectTopics(subjectId || undefined)

  React.useEffect(() => {
    if (topics) setLocalOrder(topics)
  }, [topics])

  const displayTopics = localOrder ?? topics ?? []

  const createMutation = useCreateTopic()
  const renameMutation = useRenameTopic()
  const archiveMutation = useArchiveTopic()
  const reorderMutation = useReorderTopics()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !displayTopics.length) return

    const oldIndex = displayTopics.findIndex((t) => t.id === active.id)
    const newIndex = displayTopics.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(displayTopics, oldIndex, newIndex)
    setLocalOrder(reordered)

    reorderMutation.mutate(
      { subjectId, topicIds: reordered.map((t) => t.id) },
      {
        onError: (err) => {
          setLocalOrder(displayTopics)
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  const handleSaveTitle = (id: string, title: string) => {
    renameMutation.mutate(
      { id, payload: { title } },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Topic renamed.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleAddTopic = () => {
    const title = addTitle.trim()
    if (!title) {
      showNotification({ variant: 'warning', message: 'Topic title cannot be empty.' })
      return
    }
    createMutation.mutate(
      { subjectId, title },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Topic added.' })
          setAddTitle('')
          setShowAddRow(false)
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  const handleConfirmArchive = () => {
    if (!pendingArchive) return
    archiveMutation.mutate(pendingArchive.id, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Topic archived.' })
        setPendingArchive(null)
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        setPendingArchive(null)
      },
    })
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
        >
          <ListChecks size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Subject Topics</h4>
          <p className="text-muted small mb-0">
            Define the topics that make up a subject — reused across all its assessments
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6">
              <label className="form-label fw-semibold small mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                value={subjectId}
                onChange={(e) => { setSubjectId(e.target.value); setLocalOrder(null) }}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {subjectId && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-3">
            <span className="fw-semibold">
              {isLoading
                ? 'Loading…'
                : `${displayTopics.length} Topic${displayTopics.length !== 1 ? 's' : ''}`}
              {isFetching && !isLoading && <span className="spinner-border spinner-border-sm ms-2" />}
            </span>
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1"
              style={{ background: '#10b981', color: '#fff' }}
              onClick={() => { setShowAddRow(true); setAddTitle('') }}
              disabled={isLoading}
            >
              + Add Topic
            </button>
          </div>

          {isLoading && (
            <div className="p-3 placeholder-glow">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
              ))}
            </div>
          )}

          {showAddRow && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-success bg-opacity-5">
              <ListChecks size={15} className="text-success flex-shrink-0" />
              <input
                type="text"
                className="form-control form-control-sm flex-grow-1"
                placeholder="Topic title…"
                value={addTitle}
                maxLength={120}
                autoFocus
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTopic()
                  if (e.key === 'Escape') { setShowAddRow(false); setAddTitle('') }
                }}
              />
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-1"
                disabled={createMutation.isPending}
                onClick={handleAddTopic}
              >
                {createMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <Check size={13} />}
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

          {!isLoading && displayTopics.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={displayTopics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {displayTopics.map((topic) =>
                  pendingArchive?.id === topic.id ? (
                    <ArchiveConfirmRow
                      key={topic.id}
                      topic={topic}
                      onConfirm={handleConfirmArchive}
                      onCancel={() => setPendingArchive(null)}
                      isPending={archiveMutation.isPending}
                    />
                  ) : (
                    <SortableTopicRow
                      key={topic.id}
                      topic={topic}
                      onSaveTitle={handleSaveTitle}
                      onArchive={(t) => setPendingArchive(t)}
                    />
                  ),
                )}
              </SortableContext>
            </DndContext>
          )}

          {!isLoading && displayTopics.length > 0 && (
            <div className="card-footer bg-white border-top text-muted small py-2 px-3">
              <GripVertical size={12} className="me-1" />
              Drag rows to reorder · Click a title to rename
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TeacherSubjectTopicsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <SubjectTopicsPage />
    </RoleGuard>
  )
}
