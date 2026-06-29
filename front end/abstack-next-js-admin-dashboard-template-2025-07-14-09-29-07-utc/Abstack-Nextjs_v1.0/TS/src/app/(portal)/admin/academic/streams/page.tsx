'use client'
import { useState } from 'react'
import { BookOpen, Layers, Pencil, Plus, Power, Search, Trash2, X } from 'lucide-react'
import { useStreams } from '@/features/enrollments/hooks/useStreams'
import { useStreamSubjects } from '@/features/enrollments/hooks/useStreamSubjects'
import { useCreateStream } from '@/features/enrollments/hooks/useCreateStream'
import { useUpdateStream } from '@/features/enrollments/hooks/useUpdateStream'
import { useToggleStreamStatus } from '@/features/enrollments/hooks/useToggleStreamStatus'
import { useAddStreamSubject, useRemoveStreamSubject } from '@/features/enrollments/hooks/useManageStreamSubject'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useSubjectCategories } from '@/features/subjects/hooks/useSubjectCategories'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import { ALStreamBadge } from '@/features/enrollments/components/ALStreamBadge'
import type { ALStream, StreamFormValues } from '@/features/enrollments/types'

function StreamFormModal({
  stream,
  onClose,
}: {
  stream?: ALStream
  onClose: () => void
}) {
  const [name, setName] = useState(stream?.name ?? '')
  const [description, setDescription] = useState(stream?.description ?? '')
  const [error, setError] = useState('')
  const create = useCreateStream()
  const update = useUpdateStream(stream?.id ?? 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    const payload: StreamFormValues = { name: name.trim(), description: description.trim() || undefined }
    try {
      stream ? await update.mutateAsync(payload) : await create.mutateAsync(payload)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to save stream')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1055, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3 shadow-lg" style={{ width: 440 }}>
        <div
          className="d-flex align-items-center justify-content-between p-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #20c997 0%, #0d6efd 100%)' }}
        >
          <div className="d-flex align-items-center gap-2 text-white">
            <Layers size={18} />
            <span className="fw-semibold">{stream ? 'Edit Stream' : 'New A/L Stream'}</span>
          </div>
          <button className="btn btn-sm btn-link text-white p-0" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
          <div className="mb-3">
            <label className="form-label small fw-semibold">Stream Name *</label>
            <input
              className="form-control"
              placeholder="e.g. Maths, Biology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="mb-4">
            <label className="form-label small fw-semibold">Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Optional description of this stream"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>
              {isPending && <span className="spinner-border spinner-border-sm me-1" />}
              {stream ? 'Save Changes' : 'Create Stream'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddSubjectToStreamModal({
  streamId,
  existingSubjectIds,
  onClose,
}: {
  streamId: number
  existingSubjectIds: Set<string>
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { data: subjectsPage } = useSubjects({ limit: 200 })
  const { data: categories = [] } = useSubjectCategories()
  const addSubject = useAddStreamSubject(streamId)

  const available = (subjectsPage?.data ?? []).filter((s) => {
    if (existingSubjectIds.has(s.id)) return false
    if (categoryFilter && s.categoryId !== categoryFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = async () => {
    if (!selectedId) return
    try {
      await addSubject.mutateAsync(selectedId)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add subject')
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3 shadow-lg" style={{ width: 520, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div
          className="d-flex align-items-center justify-content-between p-3 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <span className="fw-semibold text-white small">Add Subject to Stream Defaults</span>
          <button className="btn btn-sm btn-link text-white p-0" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="p-3 border-bottom d-flex gap-2">
          {error && <div className="alert alert-danger py-2 small w-100 mb-0">{error}</div>}
          {!error && (
            <>
              <div className="input-group input-group-sm flex-grow-1">
                <span className="input-group-text bg-transparent border-end-0"><Search size={13} /></span>
                <input className="form-control border-start-0" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="form-select form-select-sm" style={{ width: 150 }} value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}
        </div>

        <div className="overflow-auto flex-grow-1 px-2 py-1">
          {available.length === 0 ? (
            <p className="text-center text-muted small py-4">No available subjects</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {available.map((s) => (
                <li key={s.id}
                  className={`d-flex align-items-center gap-2 px-2 py-2 rounded-2 cursor-pointer ${selectedId === s.id ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(s.id)}
                >
                  <input type="radio" className="form-check-input mt-0" checked={selectedId === s.id} readOnly />
                  <code className="badge bg-dark-subtle text-dark" style={{ fontSize: '0.7rem' }}>{s.code}</code>
                  <span className="small flex-grow-1 fw-medium">{s.name}</span>
                  <CategoryBadge category={s.category} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-top d-flex justify-content-end gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm btn-primary" disabled={!selectedId || addSubject.isPending} onClick={handleAdd}>
            {addSubject.isPending && <span className="spinner-border spinner-border-sm me-1" />}
            Add to Stream
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ALStreamsPage() {
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null)
  const [showStreamForm, setShowStreamForm] = useState(false)
  const [editStream, setEditStream] = useState<ALStream | null>(null)
  const [showAddSubject, setShowAddSubject] = useState(false)

  const { data: streams = [], isLoading: streamsLoading } = useStreams(true)
  const { data: streamSubjects = [], isLoading: subjectsLoading } = useStreamSubjects(selectedStreamId)
  const toggleStatus = useToggleStreamStatus()
  const removeSubject = useRemoveStreamSubject(selectedStreamId ?? 0)

  const selectedStream = streams.find((s) => s.id === selectedStreamId)
  const existingSubjectIds = new Set(streamSubjects.map((row) => row.subjectId))

  const handleToggleStream = async (stream: ALStream) => {
    if (stream.isActive && !confirm(`Deactivate "${stream.name}"?`)) return
    await toggleStatus.mutateAsync({ id: stream.id, activate: !stream.isActive })
  }

  const handleRemoveSubject = async (subjectId: string, name: string) => {
    if (!confirm(`Remove "${name}" from this stream's default subjects?`)) return
    await removeSubject.mutateAsync(subjectId)
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>A/L Streams</h4>
          <p className="text-muted small mb-0">Manage Advanced Level stream defaults and subject combinations</p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => { setEditStream(null); setShowStreamForm(true) }}
        >
          <Plus size={16} />
          New Stream
        </button>
      </div>

      <div className="row g-3">
        {/* Left panel: Stream list */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 py-3 px-4"
              style={{ background: 'linear-gradient(135deg, #20c997 0%, #0d6efd 100%)' }}>
              <div className="d-flex align-items-center gap-2 text-white">
                <Layers size={16} />
                <span className="fw-semibold">Streams</span>
                <span className="badge bg-white bg-opacity-25 rounded-pill ms-1 small">
                  {streams.filter((s) => s.isActive).length} active
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {streamsLoading ? (
                <div className="p-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="placeholder-glow py-2 border-bottom">
                      <span className="placeholder col-7 rounded" style={{ height: 14 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {streams.map((stream) => (
                    <li
                      key={stream.id}
                      className={`d-flex align-items-center justify-content-between px-3 py-2 border-bottom ${selectedStreamId === stream.id ? 'bg-primary bg-opacity-10' : ''} ${!stream.isActive ? 'opacity-50' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedStreamId(stream.id)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{ width: 8, height: 8, backgroundColor: stream.isActive ? '#198754' : '#adb5bd', flexShrink: 0 }}
                        />
                        <div>
                          <div className="small fw-semibold">{stream.name}</div>
                          {stream.description && (
                            <div className="text-muted" style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>
                              {stream.description.length > 50 ? stream.description.slice(0, 50) + '…' : stream.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        {!stream.isActive && (
                          <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.65rem' }}>Inactive</span>
                        )}
                        <button
                          className="btn btn-sm btn-link text-muted p-1"
                          title="Edit"
                          onClick={(e) => { e.stopPropagation(); setEditStream(stream); setShowStreamForm(true) }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className={`btn btn-sm btn-link p-1 ${stream.isActive ? 'text-warning' : 'text-success'}`}
                          title={stream.isActive ? 'Deactivate' : 'Activate'}
                          onClick={(e) => { e.stopPropagation(); handleToggleStream(stream) }}
                        >
                          <Power size={12} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Stream subjects */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            {!selectedStream ? (
              <div className="card-body d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                <Layers size={48} className="mb-3 opacity-25" />
                <p className="fw-medium mb-1">Select a stream</p>
                <p className="small">Click any stream on the left to view its default subjects</p>
              </div>
            ) : (
              <>
                <div
                  className="card-header border-0 d-flex align-items-center justify-content-between py-3 px-4"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  <div className="d-flex align-items-center gap-2 text-white">
                    <BookOpen size={16} />
                    <span className="fw-semibold">{selectedStream.name}</span>
                    <span className="text-white-50 small">— Default Subjects</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <ALStreamBadge stream={selectedStream} size="sm" />
                    <button
                      className="btn btn-sm btn-light d-flex align-items-center gap-1"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => setShowAddSubject(true)}
                    >
                      <Plus size={13} />
                      Add Subject
                    </button>
                  </div>
                </div>

                <div className="card-body p-0">
                  {subjectsLoading ? (
                    <div className="p-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="placeholder-glow py-2 border-bottom">
                          <span className="placeholder col-6 rounded" style={{ height: 14 }} />
                        </div>
                      ))}
                    </div>
                  ) : streamSubjects.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <BookOpen size={36} className="mb-2 opacity-25" />
                      <p className="small fw-medium mb-1">No default subjects yet</p>
                      <p className="small">Click <strong>Add Subject</strong> to configure this stream&apos;s default combination</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light small text-uppercase text-muted">
                          <tr>
                            <th className="ps-4 py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Code</th>
                            <th className="py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Subject</th>
                            <th className="py-2" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Category</th>
                            <th className="pe-4 py-2 text-end" style={{ fontSize: '0.7rem' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {streamSubjects.map((row) => (
                            <tr key={row.subjectId}>
                              <td className="ps-4">
                                <code className="badge bg-dark-subtle text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>
                                  {row.subject.code}
                                </code>
                              </td>
                              <td className="small fw-medium">{row.subject.name}</td>
                              <td>
                                <CategoryBadge category={row.subject.category} size="sm" />
                              </td>
                              <td className="pe-4 text-end">
                                <button
                                  className="btn btn-sm btn-outline-danger border-0 p-1"
                                  title="Remove from stream defaults"
                                  onClick={() => handleRemoveSubject(row.subjectId, row.subject.name)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showStreamForm && (
        <StreamFormModal
          stream={editStream ?? undefined}
          onClose={() => { setShowStreamForm(false); setEditStream(null) }}
        />
      )}

      {showAddSubject && selectedStreamId && (
        <AddSubjectToStreamModal
          streamId={selectedStreamId}
          existingSubjectIds={existingSubjectIds}
          onClose={() => setShowAddSubject(false)}
        />
      )}
    </>
  )
}
