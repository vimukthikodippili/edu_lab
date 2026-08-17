'use client'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CheckCircle, Compass, GraduationCap, Lock } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAvailableSubjects } from '@/features/enrollments/hooks/useAvailableSubjects'
import { useSubmitSubjectSelection } from '@/features/enrollments/hooks/useSubmitSubjectSelection'
import { useNotificationContext } from '@/context/useNotificationContext'

function PageHeader() {
  return (
    <div className="d-flex align-items-center gap-3 mb-4">
      <div
        className="d-flex align-items-center justify-content-center rounded-3"
        style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
      >
        <GraduationCap size={22} className="text-white" />
      </div>
      <div>
        <h4 className="mb-0 fw-bold">Subject Selection</h4>
        <p className="text-muted small mb-0">Choose your subjects for the year</p>
      </div>
    </div>
  )
}

function PendingBanner({ status, reviewNote }: { status: 'pending' | 'rejected'; reviewNote: string | null }) {
  if (status === 'pending') {
    return (
      <div
        className="card border-0 shadow-sm mb-4"
        style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}
      >
        <div className="card-body p-4 d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 44, height: 44, background: 'rgba(99,102,241,0.15)' }}
          >
            <Lock size={20} className="text-primary" />
          </div>
          <div className="flex-grow-1">
            <span className="badge rounded-pill fw-semibold mb-1" style={{ background: '#fef3c7', color: '#92400e' }}>
              Pending Principal Review
            </span>
            <p className="mb-0 small text-muted">
              Your subject selection has been submitted for review by the Principal. You&apos;ll be notified once it&apos;s decided.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="alert alert-danger d-flex align-items-start gap-2 mb-4">
      <div>
        <strong>Your previous selection was not approved.</strong>
        {reviewNote && <p className="mb-0 mt-1 small">Reason: {reviewNote}</p>}
        <p className="mb-0 mt-1 small">You can submit a new selection below while this window is still open.</p>
      </div>
    </div>
  )
}

function ApprovedBanner() {
  return (
    <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%)' }}>
      <div className="card-body p-4 d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 44, height: 44, background: 'rgba(21,128,61,0.15)' }}
        >
          <CheckCircle size={20} className="text-success" />
        </div>
        <div>
          <span className="badge rounded-pill fw-semibold mb-1" style={{ background: '#dcfce7', color: '#15803d' }}>
            Approved
          </span>
          <p className="mb-0 small text-muted">
            Your subject selection has been approved and confirmed. See <strong>My Subjects</strong> for your full
            subject list. Further changes can only be made by your Principal.
          </p>
        </div>
      </div>
    </div>
  )
}

function SubjectSelectionForm() {
  const { showNotification } = useNotificationContext()
  const { data, isLoading, isError } = useAvailableSubjects()
  const submit = useSubmitSubjectSelection()

  const [streamId, setStreamId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    setSelected(new Set())
    setStreamId(null)
    setJustSubmitted(false)
  }, [data?.window?.id])

  const toggleOptional = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const min = data?.window?.minOptionalSubjects ?? 0
  const max = data?.window?.maxOptionalSubjects ?? 0
  const canSubmit = useMemo(() => {
    if (!data?.window) return false
    if (selected.size < min || selected.size > max) return false
    if (data.window.requiresStreamSelection && !streamId) return false
    return true
  }, [data, selected, min, max, streamId])

  const handleSubmit = async () => {
    try {
      await submit.mutateAsync({
        streamId: data?.window?.requiresStreamSelection ? streamId : undefined,
        optionalSubjectIds: [...selected],
      })
      setJustSubmitted(true)
      showNotification({ variant: 'success', message: 'Your subject selection has been submitted for review by the Principal.' })
    } catch (err: any) {
      showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Failed to submit your selection.' })
    }
  }

  if (isLoading) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-12 rounded" style={{ height: 200 }} />
      </div>
    )
  }

  if (isError) {
    return <div className="alert alert-danger py-2 small">Failed to load subject selection. Please refresh.</div>
  }

  if (!data?.window) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5 text-muted">
          <GraduationCap size={40} className="mb-3 opacity-25" />
          <p className="fw-medium mb-1">No subject selection is open right now</p>
          <p className="small mb-0">Check back once your school opens a selection window for your grade.</p>
        </div>
      </div>
    )
  }

  const { window, coreSubjects, optionalSubjects, streams, existingRequest, careerAdvisory } = data

  if (existingRequest?.status === 'pending' && !justSubmitted) {
    return <PendingBanner status="pending" reviewNote={existingRequest.reviewNote} />
  }

  if (existingRequest?.status === 'approved' && !justSubmitted) {
    return <ApprovedBanner />
  }

  return (
    <>
      {justSubmitted && (
        <div
          className="card border-0 shadow-sm mb-4"
          style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}
        >
          <div className="card-body p-4">
            <span className="badge rounded-pill fw-semibold mb-1" style={{ background: '#fef3c7', color: '#92400e' }}>
              Pending Principal Review
            </span>
            <p className="mb-0 small text-muted mt-1">
              Your subject selection has been submitted for review by the Principal.
            </p>
          </div>
        </div>
      )}

      {!justSubmitted && existingRequest?.status === 'rejected' && (
        <PendingBanner status="rejected" reviewNote={existingRequest.reviewNote} />
      )}

      {!justSubmitted && (
        <div className="card border-0 shadow-sm rounded-4 mb-3">
          <div className="card-body p-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0">Subject Selection for {window.academicYear}</h6>
              <span className="badge bg-secondary-subtle text-secondary border">
                Closes {new Date(window.closeDate).toLocaleDateString('en-GB')}
              </span>
            </div>

            {/* Section 1 — Core subjects */}
            <div className="mb-4">
              <div className="fw-semibold small mb-2 d-flex align-items-center gap-2">
                <BookOpen size={14} /> Core Subjects
              </div>
              {coreSubjects.length === 0 ? (
                <p className="text-muted small mb-0">No core subjects configured for this window.</p>
              ) : (
                <div className="d-flex flex-column gap-2 opacity-50">
                  {coreSubjects.map((s) => (
                    <div key={s.id} className="d-flex align-items-center gap-2">
                      <input type="checkbox" className="form-check-input mt-0" checked disabled />
                      <span className="small">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.75rem' }}>
                Core subjects are compulsory and automatically included.
              </p>
            </div>

            {/* Section 2 — Stream selection */}
            {window.requiresStreamSelection && (
              <div className="mb-4">
                <div className="fw-semibold small mb-2">Choose Your A/L Stream</div>
                <ul className="list-unstyled mb-0">
                  {streams.map((s) => (
                    <li
                      key={s.id}
                      className={`d-flex align-items-center gap-2 px-2 py-2 rounded-2 ${streamId === s.id ? 'bg-primary bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setStreamId(s.id)}
                    >
                      <input type="radio" className="form-check-input mt-0" checked={streamId === s.id} readOnly />
                      <div>
                        <div className="small fw-medium">{s.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {s.subjects.map((sub) => sub.name).join(' + ') || 'No subjects configured'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 3 — Optional subjects */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold small">Optional Subjects</span>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  {min === max ? `Choose ${min}` : `Choose ${min}–${max}`} ({selected.size} selected)
                </span>
              </div>
              {optionalSubjects.length === 0 ? (
                <p className="text-muted small mb-0">No optional subjects configured for this window.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {optionalSubjects.map((s) => (
                    <label key={s.id} className="d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        checked={selected.has(s.id)}
                        onChange={() => toggleOptional(s.id)}
                      />
                      <span className="small">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* RIASEC advisory — display only, never restricts the choices above */}
            {careerAdvisory && (
              <div className="alert alert-info small d-flex align-items-start gap-2 mb-4">
                <Compass size={15} className="flex-shrink-0 mt-1" />
                <span>
                  Your RIASEC profile suggests <strong>{careerAdvisory.label}</strong> — this is for your reference
                  only. You can choose any subjects you wish.
                </span>
              </div>
            )}

            <button
              type="button"
              className="btn fw-semibold text-white w-100"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', border: 'none' }}
              disabled={!canSubmit || submit.isPending}
              onClick={handleSubmit}
            >
              {submit.isPending ? 'Submitting…' : 'Submit Selection'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function StudentSubjectSelectionPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <div className="container-fluid px-4 py-4">
        <PageHeader />
        <SubjectSelectionForm />
      </div>
    </RoleGuard>
  )
}
