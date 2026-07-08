'use client'
import React, { useState } from 'react'
import { NotebookPen, CheckCircle, AlertTriangle, Clock, Paperclip, X } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useClassDiaryDaily } from '@/features/class-diary/hooks/useClassDiaryDaily'
import { useUpsertClassDiaryEntry } from '@/features/class-diary/hooks/useUpsertClassDiaryEntry'
import { useUploadFile } from '@/features/staff/hooks/useUploadFile'

const todayStr = () => new Date().toISOString().split('T')[0]

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const data = e?.response?.data
  if (data?.errors) return Object.values(data.errors).join('; ')
  return data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Page inner ───────────────────────────────────────────────────────────────

function ClassDiaryPage() {
  const { showNotification } = useNotificationContext()

  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [loadedDate, setLoadedDate] = useState<string | null>(null)

  // Local notes: { [timetableEntryId]: string }
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({})
  // Attachment file ids (existing + newly uploaded): { [timetableEntryId]: string[] }
  const [attachmentIds, setAttachmentIds] = useState<Record<number, string[]>>({})
  // Saving state per slot: { [timetableEntryId]: boolean }
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  // Uploading state per slot: { [timetableEntryId]: boolean }
  const [uploading, setUploading] = useState<Record<number, boolean>>({})

  const {
    data: slots,
    isLoading: slotsLoading,
    isFetching: slotsFetching,
  } = useClassDiaryDaily(loadedDate ?? '')

  // Sync local state from server data whenever slots arrive
  React.useEffect(() => {
    if (!slots) return
    setLocalNotes((prev) => {
      const next = { ...prev }
      slots.forEach((s) => {
        if (next[s.timetableEntry.id] === undefined) {
          next[s.timetableEntry.id] = s.diaryEntry?.notes ?? ''
        }
      })
      return next
    })
    setAttachmentIds((prev) => {
      const next = { ...prev }
      slots.forEach((s) => {
        if (next[s.timetableEntry.id] === undefined) {
          next[s.timetableEntry.id] = s.diaryEntry?.attachmentFileIds ?? []
        }
      })
      return next
    })
  }, [slots])

  // Reset local state when the loaded date changes
  React.useEffect(() => {
    setLocalNotes({})
    setAttachmentIds({})
    setSaving({})
    setUploading({})
  }, [loadedDate])

  const upsertMutation = useUpsertClassDiaryEntry()
  const uploadMutation = useUploadFile()

  const handleLoad = () => {
    if (!selectedDate) {
      showNotification({ variant: 'warning', message: 'Please select a date.' })
      return
    }
    setLoadedDate(selectedDate)
  }

  const handleFileSelect = (timetableEntryId: number, file: File | undefined) => {
    if (!file) return
    setUploading((prev) => ({ ...prev, [timetableEntryId]: true }))
    uploadMutation.mutate(file, {
      onSuccess: ({ file: uploaded }) => {
        setUploading((prev) => ({ ...prev, [timetableEntryId]: false }))
        setAttachmentIds((prev) => ({
          ...prev,
          [timetableEntryId]: [...(prev[timetableEntryId] ?? []), uploaded.id],
        }))
      },
      onError: (err) => {
        setUploading((prev) => ({ ...prev, [timetableEntryId]: false }))
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
      },
    })
  }

  const handleRemoveAttachment = (timetableEntryId: number, fileId: string) => {
    setAttachmentIds((prev) => ({
      ...prev,
      [timetableEntryId]: (prev[timetableEntryId] ?? []).filter((id) => id !== fileId),
    }))
  }

  const handleSave = (timetableEntryId: number) => {
    if (!loadedDate) return
    setSaving((prev) => ({ ...prev, [timetableEntryId]: true }))
    upsertMutation.mutate(
      {
        timetableEntryId,
        date: loadedDate,
        notes: localNotes[timetableEntryId] ?? '',
        attachmentFileIds: attachmentIds[timetableEntryId] ?? [],
      },
      {
        onSuccess: () => {
          setSaving((prev) => ({ ...prev, [timetableEntryId]: false }))
          showNotification({ variant: 'success', message: 'Diary entry saved.' })
        },
        onError: (err) => {
          setSaving((prev) => ({ ...prev, [timetableEntryId]: false }))
          showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        },
      },
    )
  }

  const isLoading = !!loadedDate && slotsLoading
  const orderedSlots = [...(slots ?? [])].sort(
    (a, b) => a.timetableEntry.period - b.timetableEntry.period,
  )
  const isPastDate = !!loadedDate && loadedDate < todayStr()

  return (
    <div className="container-fluid py-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <NotebookPen size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Class Diary</h4>
          <p className="text-muted small mb-0">Panthi Wartha Potha — daily record of what you taught</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-8 col-sm-4">
              <label className="form-label fw-semibold small mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="col-4 col-sm-3">
              <button
                type="button"
                className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={!selectedDate}
                onClick={handleLoad}
              >
                {slotsFetching && loadedDate && <span className="spinner-border spinner-border-sm" />}
                Load
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content area — only after Load */}
      {loadedDate && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <span className="fw-semibold">
              {isLoading ? 'Loading…' : 'Periods'}
              <span className="text-muted ms-2 fw-normal small">
                · {new Date(`${loadedDate}T00:00:00Z`).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </span>
          </div>

          {/* Loading skeletons */}
          {isLoading && (
            <div className="p-3 placeholder-glow">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 60 }} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && orderedSlots.length === 0 && (
            <div className="py-5 text-center text-muted">
              <NotebookPen size={40} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No periods scheduled</p>
              <p className="small mb-0">
                This date has no timetable periods for you — it may be a holiday or non-working day.
              </p>
            </div>
          )}

          {/* Period cards */}
          {!isLoading && orderedSlots.length > 0 && (
            <div className="p-3 d-flex flex-column gap-3">
              {orderedSlots.map((slot) => {
                const { timetableEntry, diaryEntry } = slot
                const id = timetableEntry.id
                const notes = localNotes[id] ?? ''
                const attachments = attachmentIds[id] ?? []
                const existingAttachments = diaryEntry?.attachments ?? []
                const isSaving = !!saving[id]
                const isUploading = !!uploading[id]
                const isLogged = notes.trim().length > 0
                const statusBadge = isLogged
                  ? { icon: CheckCircle, label: 'Logged', cls: 'bg-success bg-opacity-15 text-success' }
                  : isPastDate
                  ? { icon: AlertTriangle, label: 'Missing', cls: 'bg-warning bg-opacity-15 text-warning-emphasis' }
                  : { icon: Clock, label: 'Pending', cls: 'bg-secondary bg-opacity-15 text-secondary' }

                return (
                  <div key={id} className="border rounded-3 p-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="badge bg-secondary bg-opacity-15 text-secondary fw-semibold"
                          style={{ minWidth: 32, fontSize: '0.72rem' }}
                        >
                          Period {timetableEntry.period}
                        </span>
                        <span className="fw-medium small">{timetableEntry.subject.name}</span>
                        <span className="text-muted small">· {timetableEntry.classSection.name}</span>
                      </div>
                      <span className={`badge d-inline-flex align-items-center gap-1 ${statusBadge.cls}`}>
                        <statusBadge.icon size={13} />
                        {statusBadge.label}
                      </span>
                    </div>

                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder="What did you teach in this period?"
                      value={notes}
                      onChange={(e) => setLocalNotes((prev) => ({ ...prev, [id]: e.target.value }))}
                    />

                    <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                      {existingAttachments
                        .filter((f) => attachments.includes(f.id))
                        .map((f) => (
                          <span
                            key={f.id}
                            className="badge bg-secondary bg-opacity-15 text-secondary d-inline-flex align-items-center gap-1"
                          >
                            <Paperclip size={11} />
                            Attachment
                            <button
                              type="button"
                              className="btn-close btn-close-sm"
                              style={{ fontSize: '0.55rem' }}
                              onClick={() => handleRemoveAttachment(id, f.id)}
                              aria-label="Remove attachment"
                            />
                          </span>
                        ))}
                      {attachments
                        .filter((fid) => !existingAttachments.some((f) => f.id === fid))
                        .map((fid) => (
                          <span
                            key={fid}
                            className="badge bg-secondary bg-opacity-15 text-secondary d-inline-flex align-items-center gap-1"
                          >
                            <Paperclip size={11} />
                            New attachment
                            <X
                              size={11}
                              role="button"
                              onClick={() => handleRemoveAttachment(id, fid)}
                            />
                          </span>
                        ))}
                    </div>

                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <label className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 mb-0">
                        {isUploading && <span className="spinner-border spinner-border-sm" />}
                        <Paperclip size={13} />
                        Attach file
                        <input
                          type="file"
                          className="d-none"
                          disabled={isUploading}
                          onChange={(e) => {
                            handleFileSelect(id, e.target.files?.[0])
                            e.target.value = ''
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        disabled={isSaving}
                        onClick={() => handleSave(id)}
                      >
                        {isSaving && <span className="spinner-border spinner-border-sm" />}
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && orderedSlots.length > 0 && (
            <div className="card-footer bg-white border-top text-muted small py-2 px-3">
              Log what was taught in each period, then Save. Missing entries are flagged and remind you automatically.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Export with RoleGuard ────────────────────────────────────────────────────

export default function TeacherClassDiary() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SYSTEM_ADMIN, ROLES.SECTION_HEAD]}>
      <ClassDiaryPage />
    </RoleGuard>
  )
}
