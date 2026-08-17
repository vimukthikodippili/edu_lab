'use client'
import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, CalendarRange, Plus, Search, X } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useGradeStages } from '@/features/grade-stages/hooks/useGradeStages'
import { useSubjectSelectionWindows } from '@/features/enrollments/hooks/useSubjectSelectionWindows'
import { useCreateSubjectSelectionWindow, type CreateSubjectSelectionWindowPayload } from '@/features/enrollments/hooks/useCreateSubjectSelectionWindow'
import { useToggleSubjectSelectionWindow } from '@/features/enrollments/hooks/useToggleSubjectSelectionWindow'
import {
  useWindowCoreSubjects,
  useWindowOptionalSubjects,
  useSetWindowCoreSubjects,
  useSetWindowOptionalSubjects,
} from '@/features/enrollments/hooks/useWindowSubjects'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useSubjectCategories } from '@/features/subjects/hooks/useSubjectCategories'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import type { SubjectSelectionWindow } from '@/types/sims/subject-selection'

function NewWindowModal({ onClose }: { onClose: () => void }) {
  const { data: gradeStages = [] } = useGradeStages()
  const create = useCreateSubjectSelectionWindow()
  const [error, setError] = useState('')
  const [form, setForm] = useState<CreateSubjectSelectionWindowPayload>({
    gradeStageId: '',
    academicYear: new Date().getFullYear(),
    openDate: '',
    closeDate: '',
    minOptionalSubjects: 0,
    maxOptionalSubjects: 0,
    requiresStreamSelection: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.gradeStageId || !form.openDate || !form.closeDate) {
      setError('Grade stage, open date, and close date are required.')
      return
    }
    try {
      await create.mutateAsync(form)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create the window.')
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1055, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3 shadow-lg" style={{ width: 480 }}>
        <div
          className="d-flex align-items-center justify-content-between p-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="d-flex align-items-center gap-2 text-white">
            <CalendarRange size={18} />
            <span className="fw-semibold">New Subject Selection Window</span>
          </div>
          <button className="btn btn-sm btn-link text-white p-0" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

          <div className="mb-3">
            <label className="form-label small fw-semibold">Grade Stage *</label>
            <select
              className="form-select"
              value={form.gradeStageId}
              onChange={(e) => setForm((f) => ({ ...f, gradeStageId: e.target.value }))}
            >
              <option value="">Select a grade stage…</option>
              {gradeStages.map((gs) => (
                <option key={gs.id} value={gs.id}>{gs.stageName} (Grade {gs.fromGrade}-{gs.toGrade})</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label small fw-semibold">Academic Year *</label>
            <input
              type="number"
              className="form-control"
              min={2000}
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: Number(e.target.value) }))}
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small fw-semibold">Opens *</label>
              <input
                type="date"
                className="form-control"
                value={form.openDate}
                onChange={(e) => setForm((f) => ({ ...f, openDate: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Closes *</label>
              <input
                type="date"
                className="form-control"
                value={form.closeDate}
                onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label small fw-semibold">Min Optional Subjects</label>
              <input
                type="number"
                className="form-control"
                min={0}
                value={form.minOptionalSubjects}
                onChange={(e) => setForm((f) => ({ ...f, minOptionalSubjects: Math.max(0, Number(e.target.value)) }))}
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Max Optional Subjects</label>
              <input
                type="number"
                className="form-control"
                min={0}
                value={form.maxOptionalSubjects}
                onChange={(e) => setForm((f) => ({ ...f, maxOptionalSubjects: Math.max(0, Number(e.target.value)) }))}
              />
            </div>
          </div>

          <div className="form-check form-switch mb-4">
            <input
              type="checkbox"
              role="switch"
              id="requiresStream"
              className="form-check-input"
              checked={!!form.requiresStreamSelection}
              onChange={(e) => setForm((f) => ({ ...f, requiresStreamSelection: e.target.checked }))}
            />
            <label className="form-check-label small fw-semibold" htmlFor="requiresStream">
              Requires A/L stream selection
            </label>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={create.isPending}>
              {create.isPending && <span className="spinner-border spinner-border-sm me-1" />}
              Create Window
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ManageWindowSubjectsModal({
  windowId,
  mode,
  currentSubjectIds,
  onClose,
}: {
  windowId: string
  mode: 'core' | 'optional'
  currentSubjectIds: Set<string>
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSubjectIds))

  const { data: subjectsPage } = useSubjects({ limit: 100 })
  const { data: categories = [] } = useSubjectCategories()
  const setCore = useSetWindowCoreSubjects(windowId)
  const setOptional = useSetWindowOptionalSubjects(windowId)
  const mutation = mode === 'core' ? setCore : setOptional

  const filtered = (subjectsPage?.data ?? []).filter((s) => {
    if (categoryFilter && s.categoryId !== categoryFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    await mutation.mutateAsync([...selected])
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3 shadow-lg" style={{ width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div
          className="d-flex align-items-center justify-content-between p-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="d-flex align-items-center gap-2 text-white">
            <BookOpen size={20} />
            <span className="fw-semibold fs-5">{mode === 'core' ? 'Core Subjects' : 'Optional Subject Pool'}</span>
          </div>
          <button className="btn btn-sm btn-link text-white p-0" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-3 border-bottom d-flex gap-2">
          <div className="input-group input-group-sm flex-grow-1">
            <span className="input-group-text bg-transparent border-end-0"><Search size={14} className="text-muted" /></span>
            <input className="form-control border-start-0" placeholder="Search subjects…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 160 }} value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="overflow-auto flex-grow-1 p-2">
          {filtered.length === 0 ? (
            <div className="text-center text-muted py-5">
              <BookOpen size={32} className="mb-2 opacity-50" />
              <p className="mb-0 small">No subjects match your search</p>
            </div>
          ) : (
            <ul className="list-unstyled mb-0">
              {filtered.map((s) => (
                <li key={s.id} className="d-flex align-items-center gap-3 px-2 py-2 rounded-2">
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    style={{ cursor: 'pointer' }}
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    id={`wsubj-${s.id}`}
                  />
                  <label htmlFor={`wsubj-${s.id}`} className="d-flex align-items-center gap-2 flex-grow-1 mb-0" style={{ cursor: 'pointer' }}>
                    <code className="badge bg-dark-subtle text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>{s.code}</code>
                    <span className="flex-grow-1 small fw-medium">{s.name}</span>
                    <CategoryBadge category={s.category} size="sm" />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-3 border-top d-flex justify-content-between align-items-center">
          <span className="small text-muted">{selected.size} selected</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-sm btn-primary" disabled={mutation.isPending} onClick={handleSave}>
              {mutation.isPending && <span className="spinner-border spinner-border-sm me-1" />}
              Save List ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function WindowDetail({ window }: { window: SubjectSelectionWindow }) {
  const [manageMode, setManageMode] = useState<'core' | 'optional' | null>(null)
  const { data: coreRows = [], isLoading: coreLoading } = useWindowCoreSubjects(window.id)
  const { data: optionalRows = [], isLoading: optionalLoading } = useWindowOptionalSubjects(window.id)
  const toggleActive = useToggleSubjectSelectionWindow()

  return (
    <div className="card border-0 shadow-sm h-100">
      <div
        className="card-header border-0 d-flex align-items-center justify-content-between py-3 px-4"
        style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
      >
        <div className="d-flex align-items-center gap-2 text-white">
          <CalendarRange size={16} />
          <span className="fw-semibold">{window.gradeStage?.stageName ?? 'Grade Stage'} — {window.academicYear}</span>
        </div>
        <div className="form-check form-switch mb-0">
          <input
            type="checkbox"
            role="switch"
            className="form-check-input"
            checked={window.isActive}
            disabled={toggleActive.isPending}
            onChange={() => toggleActive.mutate(window.id)}
          />
        </div>
      </div>

      <div className="card-body">
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="text-muted small">Opens</div>
            <div className="fw-semibold">{new Date(window.openDate).toLocaleDateString('en-GB')}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Closes</div>
            <div className="fw-semibold">{new Date(window.closeDate).toLocaleDateString('en-GB')}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">Optional Subjects</div>
            <div className="fw-semibold">Choose {window.minOptionalSubjects}–{window.maxOptionalSubjects}</div>
          </div>
          <div className="col-6">
            <div className="text-muted small">A/L Stream Required</div>
            <div className="fw-semibold">{window.requiresStreamSelection ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {window.requiresStreamSelection && (
          <div className="alert alert-info small d-flex align-items-center justify-content-between mb-4">
            <span>A/L streams and their subject packages are managed separately.</span>
            <Link href="/admin/academic/streams" className="fw-semibold">Manage Streams →</Link>
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-semibold small">Core Subjects (auto-included)</span>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setManageMode('core')}>
            <Plus size={13} className="me-1" />Manage
          </button>
        </div>
        <div className="mb-4">
          {coreLoading ? (
            <div className="text-muted small">Loading…</div>
          ) : coreRows.length === 0 ? (
            <div className="text-muted small">No core subjects configured yet.</div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {coreRows.map((r) => (
                <span key={r.subjectId} className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  {r.subject.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-semibold small">Optional Subject Pool</span>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setManageMode('optional')}>
            <Plus size={13} className="me-1" />Manage
          </button>
        </div>
        <div>
          {optionalLoading ? (
            <div className="text-muted small">Loading…</div>
          ) : optionalRows.length === 0 ? (
            <div className="text-muted small">No optional subjects configured yet.</div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {optionalRows.map((r) => (
                <span key={r.subjectId} className="badge bg-warning-subtle text-warning border border-warning-subtle">
                  {r.subject.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {manageMode && (
        <ManageWindowSubjectsModal
          windowId={window.id}
          mode={manageMode}
          currentSubjectIds={new Set((manageMode === 'core' ? coreRows : optionalRows).map((r) => r.subjectId))}
          onClose={() => setManageMode(null)}
        />
      )}
    </div>
  )
}

function SubjectSelectionWindowContent() {
  const { data: windows = [], isLoading } = useSubjectSelectionWindows()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewWindow, setShowNewWindow] = useState(false)

  const selected = windows.find((w) => w.id === selectedId) ?? windows[0]

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>Subject Selection Windows</h4>
          <p className="text-muted small mb-0">
            Configure per-grade-stage subject selection periods — electives for Grade 10+, aesthetic subjects for Grade 6-9
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowNewWindow(true)}>
          <Plus size={16} />
          New Window
        </button>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 py-3 px-4" style={{ background: 'linear-gradient(135deg, #20c997 0%, #0d6efd 100%)' }}>
              <span className="fw-semibold text-white">Windows</span>
            </div>
            <div className="card-body p-0">
              {isLoading ? (
                <div className="p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="placeholder-glow py-2 border-bottom">
                      <span className="placeholder col-7 rounded" style={{ height: 14 }} />
                    </div>
                  ))}
                </div>
              ) : windows.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <CalendarRange size={36} className="mb-2 opacity-25" />
                  <p className="small mb-0">No windows configured yet</p>
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {windows.map((w) => (
                    <li
                      key={w.id}
                      className={`d-flex align-items-center justify-content-between px-3 py-2 border-bottom ${selected?.id === w.id ? 'bg-primary bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(w.id)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{ width: 8, height: 8, backgroundColor: w.isActive ? '#198754' : '#adb5bd', flexShrink: 0 }}
                        />
                        <div>
                          <div className="small fw-semibold">{w.gradeStage?.stageName ?? 'Grade Stage'}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{w.academicYear}</div>
                        </div>
                      </div>
                      {!w.isActive && <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.65rem' }}>Closed</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {selected ? (
            <WindowDetail window={selected} />
          ) : (
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                <CalendarRange size={48} className="mb-3 opacity-25" />
                <p className="fw-medium mb-1">No window selected</p>
                <p className="small">Create a window to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewWindow && <NewWindowModal onClose={() => setShowNewWindow(false)} />}
    </>
  )
}

export default function SubjectSelectionWindowPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <div className="container-fluid px-4 py-4">
        <SubjectSelectionWindowContent />
      </div>
    </RoleGuard>
  )
}
