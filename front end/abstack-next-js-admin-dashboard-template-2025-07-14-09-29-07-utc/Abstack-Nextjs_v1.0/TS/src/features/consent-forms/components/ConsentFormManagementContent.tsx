'use client'
import { useMemo, useState } from 'react'
import { FileSignature, Send, Search, X, Bell, ListChecks } from 'lucide-react'
import { useConsentForms } from '../hooks/useConsentForms'
import { useCreateConsentForm } from '../hooks/useCreateConsentForm'
import { useConsentDashboard } from '../hooks/useConsentDashboard'
import { useRemindPending } from '../hooks/useRemindPending'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useStudents } from '@/features/students/hooks/useStudents'
import { CONSENT_TARGET_TYPE_LABELS, type ConsentTargetType } from '@/types/sims/consent'
import { useNotificationContext } from '@/context/useNotificationContext'

interface PickedStudent {
  id: string
  name: string
}

const STATUS_BADGE: Record<string, string> = {
  signed: 'bg-success',
  declined: 'bg-danger',
  pending: 'bg-secondary',
}

function ApiErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function StudentMultiPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: PickedStudent[]
  onAdd: (student: PickedStudent) => void
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data } = useStudents({ search, limit: 8 })
  const students = data?.data ?? []
  const selectedIds = new Set(selected.map((p) => p.id))

  return (
    <div>
      <div className="position-relative" style={{ maxWidth: 360 }}>
        <Search size={14} className="text-muted position-absolute" style={{ top: 9, left: 10 }} />
        <input
          type="text"
          className="form-control form-control-sm ps-4"
          placeholder="Search a student by name or admission number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim().length > 0 && (
          <div className="border rounded-2 shadow-sm bg-white mt-1 position-absolute w-100" style={{ zIndex: 5, maxHeight: 240, overflowY: 'auto' }}>
            {students.length === 0 && <div className="px-3 py-2 small text-muted">No matching students.</div>}
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                className="dropdown-item d-flex align-items-center justify-content-between px-3 py-2 small"
                disabled={selectedIds.has(s.id)}
                onClick={() => onAdd({ id: s.id, name: `${s.firstName} ${s.lastName}` })}
              >
                <span>{s.firstName} {s.lastName} <span className="text-muted">({s.admissionNumber})</span></span>
                {selectedIds.has(s.id) && <span className="text-success">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {selected.map((p) => (
            <span key={p.id} className="badge bg-primary bg-opacity-15 text-primary d-inline-flex align-items-center gap-1">
              {p.name}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onRemove(p.id)} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function ConsentFormManagementContent() {
  const { data: forms, isLoading } = useConsentForms()
  const { data: grades = [] } = useGrades()
  const createForm = useCreateConsentForm()
  const remindPending = useRemindPending()
  const { showNotification } = useNotificationContext()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [targetType, setTargetType] = useState<ConsentTargetType>('specific_grades')
  const [gradeIds, setGradeIds] = useState<number[]>([])
  const [pickedStudents, setPickedStudents] = useState<PickedStudent[]>([])

  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const { data: dashboard, isLoading: dashboardLoading } = useConsentDashboard(selectedFormId)

  const toggleGrade = (id: number) => {
    setGradeIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }

  const isValid =
    title.trim() &&
    description.trim() &&
    deadline &&
    (targetType === 'all_parents' ||
      (targetType === 'specific_grades' && gradeIds.length > 0) ||
      (targetType === 'specific_students' && pickedStudents.length > 0))

  const handleCreate = () => {
    if (!isValid) return
    createForm.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        deadline,
        targetType,
        targetGrades: targetType === 'specific_grades' ? gradeIds : undefined,
        targetStudentIds: targetType === 'specific_students' ? pickedStudents.map((p) => p.id) : undefined,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Consent form created — targeted guardians have been notified.' })
          setTitle('')
          setDescription('')
          setDeadline('')
          setGradeIds([])
          setPickedStudents([])
        },
        onError: (err) => showNotification({ variant: 'danger', message: ApiErrorMessage(err) }),
      },
    )
  }

  const handleRemindPending = () => {
    if (!selectedFormId) return
    remindPending.mutate(selectedFormId, {
      onSuccess: (data) => showNotification({ variant: 'success', message: `Reminded ${data.remindedCount} guardian(s) still pending.` }),
      onError: (err) => showNotification({ variant: 'danger', message: ApiErrorMessage(err) }),
    })
  }

  const dashboardSummary = useMemo(() => {
    if (!dashboard) return null
    const signed = dashboard.filter((r) => r.status === 'signed').length
    const declined = dashboard.filter((r) => r.status === 'declined').length
    const pending = dashboard.filter((r) => r.status === 'pending').length
    return { signed, declined, pending }
  }, [dashboard])

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <FileSignature size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Digital Consent Forms</h4>
          <p className="text-muted small mb-0">Create consent forms, track signatures, and remind pending guardians.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-3 bg-white">
          <span className="fw-bold">Create a Consent Form</span>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Title</label>
              <input type="text" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Colombo Museum Field Trip — Grade 8" />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Deadline</label>
              <input type="date" className="form-control" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Target Audience</label>
              <select className="form-select" value={targetType} onChange={(e) => setTargetType(e.target.value as ConsentTargetType)}>
                {(Object.keys(CONSENT_TARGET_TYPE_LABELS) as ConsentTargetType[]).map((t) => (
                  <option key={t} value={t}>{CONSENT_TARGET_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Description</label>
              <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details parents need before signing…" />
            </div>

            {targetType === 'specific_grades' && (
              <div className="col-12">
                <label className="form-label small fw-semibold mb-2">Grades</label>
                <div className="d-flex flex-wrap gap-2">
                  {grades.map((g) => (
                    <button key={g.id} type="button" className={`btn btn-sm ${gradeIds.includes(g.id) ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => toggleGrade(g.id)}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {targetType === 'specific_students' && (
              <div className="col-12">
                <label className="form-label small fw-semibold mb-2">Students</label>
                <StudentMultiPicker
                  selected={pickedStudents}
                  onAdd={(s) => setPickedStudents((prev) => [...prev, s])}
                  onRemove={(id) => setPickedStudents((prev) => prev.filter((p) => p.id !== id))}
                />
              </div>
            )}

            <div className="col-12">
              <button type="button" className="btn btn-primary d-flex align-items-center gap-2" disabled={!isValid || createForm.isPending} onClick={handleCreate}>
                <Send size={14} /> {createForm.isPending ? 'Creating…' : 'Create & Notify Guardians'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <span className="fw-bold text-white d-flex align-items-center gap-2"><ListChecks size={16} /> Consent Forms</span>
            </div>
            <div className="card-body p-0">
              {isLoading ? (
                <div className="p-4 text-muted small">Loading…</div>
              ) : !forms?.length ? (
                <div className="p-5 text-center text-muted">
                  <FileSignature size={36} className="mb-2 opacity-25" />
                  <p className="mb-0">No consent forms yet.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush" style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {forms.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`list-group-item list-group-item-action ${selectedFormId === f.id ? 'active' : ''}`}
                      onClick={() => setSelectedFormId(f.id)}
                    >
                      <div className="small fw-semibold">{f.title}</div>
                      <div className={`small ${selectedFormId === f.id ? 'text-white-50' : 'text-muted'}`}>
                        Deadline {new Date(f.deadline).toLocaleDateString()} · {CONSENT_TARGET_TYPE_LABELS[f.targetType]}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header border-0 py-3 px-4 rounded-top-3 bg-white d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="fw-bold">Per-Student Status</span>
              {selectedFormId && (
                <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" disabled={remindPending.isPending} onClick={handleRemindPending}>
                  <Bell size={12} /> {remindPending.isPending ? 'Sending…' : 'Remind All Pending'}
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {!selectedFormId ? (
                <div className="p-5 text-center text-muted">Select a consent form to see its dashboard.</div>
              ) : dashboardLoading ? (
                <div className="p-4 text-muted small">Loading…</div>
              ) : !dashboard?.length ? (
                <div className="p-5 text-center text-muted">No targeted students found.</div>
              ) : (
                <>
                  {dashboardSummary && (
                    <div className="d-flex gap-3 px-4 py-3 border-bottom small">
                      <span><span className="badge bg-success">{dashboardSummary.signed}</span> Signed</span>
                      <span><span className="badge bg-danger">{dashboardSummary.declined}</span> Declined</span>
                      <span><span className="badge bg-secondary">{dashboardSummary.pending}</span> Pending</span>
                    </div>
                  )}
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Student</th>
                          <th>Status</th>
                          <th className="pe-4">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.map((row) => (
                          <tr key={row.student.id}>
                            <td className="ps-4 small fw-semibold">{row.student.firstName} {row.student.lastName}</td>
                            <td className="small"><span className={`badge ${STATUS_BADGE[row.status]}`}>{row.status}</span></td>
                            <td className="pe-4 small">{row.response?.reason ?? <span className="text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
