'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Send, Users, Search, X, History, MessageSquare, Mail, Bell } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useRecipientPreview } from '@/features/communication/hooks/useRecipientPreview'
import { useSendTargetedMessage } from '@/features/communication/hooks/useSendTargetedMessage'
import type { RecipientCriteria } from '@/types/sims/communication'

const MAX_BODY_CHARS = 2000

interface PickedPerson {
  id: string
  name: string
}

function ApiErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } } }
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

// ─── Individual guardian picker (via student search) ───────────────────────

function GuardianPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: PickedPerson[]
  onAdd: (person: PickedPerson) => void
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
          placeholder="Search a student to add their guardian(s)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim().length > 0 && (
          <div
            className="border rounded-2 shadow-sm bg-white mt-1 position-absolute w-100"
            style={{ zIndex: 5, maxHeight: 240, overflowY: 'auto' }}
          >
            {students.length === 0 && <div className="px-3 py-2 small text-muted">No matching students.</div>}
            {students.map((s) => (
              <div key={s.id} className="px-3 py-2 border-bottom">
                <div className="small fw-semibold mb-1">
                  {s.firstName} {s.lastName} <span className="text-muted">({s.admissionNumber})</span>
                </div>
                {s.guardians.length === 0 && <div className="small text-muted">No guardians on file.</div>}
                {s.guardians.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="btn btn-link btn-sm p-0 d-block small"
                    disabled={selectedIds.has(g.id)}
                    onClick={() => onAdd({ id: g.id, name: `${g.firstName} ${g.lastName}` })}
                  >
                    {selectedIds.has(g.id) ? '✓ ' : '+ '}
                    {g.firstName} {g.lastName} ({g.relationship})
                  </button>
                ))}
              </div>
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

// ─── Individual staff picker ─────────────────────────────────────────────

function StaffPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: PickedPerson[]
  onAdd: (person: PickedPerson) => void
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data } = useStaff({ search, limit: 8 })
  const staffList = data?.data ?? []
  const selectedIds = new Set(selected.map((p) => p.id))

  return (
    <div>
      <div className="position-relative" style={{ maxWidth: 360 }}>
        <Search size={14} className="text-muted position-absolute" style={{ top: 9, left: 10 }} />
        <input
          type="text"
          className="form-control form-control-sm ps-4"
          placeholder="Search a teacher/staff member by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim().length > 0 && (
          <div
            className="border rounded-2 shadow-sm bg-white mt-1 position-absolute w-100"
            style={{ zIndex: 5, maxHeight: 240, overflowY: 'auto' }}
          >
            {staffList.length === 0 && <div className="px-3 py-2 small text-muted">No matching staff.</div>}
            {staffList.map((s) => (
              <button
                key={s.id}
                type="button"
                className="dropdown-item d-flex align-items-center justify-content-between px-3 py-2 small"
                disabled={selectedIds.has(s.id)}
                onClick={() => onAdd({ id: s.id, name: `${s.firstName} ${s.lastName}` })}
              >
                <span>{s.firstName} {s.lastName} <span className="text-muted">({s.designation})</span></span>
                {selectedIds.has(s.id) && <span className="text-success">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {selected.map((p) => (
            <span key={p.id} className="badge bg-success bg-opacity-15 text-success d-inline-flex align-items-center gap-1">
              {p.name}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => onRemove(p.id)} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page content ────────────────────────────────────────────────────────

function TargetedMessageContent() {
  const { showNotification } = useNotificationContext()

  const [allParents, setAllParents] = useState(false)
  const [allTeachers, setAllTeachers] = useState(false)
  const [gradeIds, setGradeIds] = useState<number[]>([])
  const [classSectionIds, setClassSectionIds] = useState<number[]>([])
  const [guardians, setGuardians] = useState<PickedPerson[]>([])
  const [staffPicked, setStaffPicked] = useState<PickedPerson[]>([])

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [channelSms, setChannelSms] = useState(true)
  const [channelEmail, setChannelEmail] = useState(true)
  const [channelPush, setChannelPush] = useState(false)

  const { data: grades = [] } = useGrades()
  const { data: sections = [] } = useClassSections()

  const criteria: RecipientCriteria = useMemo(
    () => ({
      allParents,
      allTeachers,
      gradeIds,
      classSectionIds,
      guardianIds: guardians.map((g) => g.id),
      staffIds: staffPicked.map((s) => s.id),
    }),
    [allParents, allTeachers, gradeIds, classSectionIds, guardians, staffPicked],
  )

  const previewMutation = useRecipientPreview()
  const sendMutation = useSendTargetedMessage()

  useEffect(() => {
    const timer = setTimeout(() => {
      previewMutation.mutate(criteria)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(criteria)])

  const preview = previewMutation.data
  const hasAnyChannel = channelSms || channelEmail || channelPush
  const hasAnyRecipientCriteria =
    allParents || allTeachers || gradeIds.length > 0 || classSectionIds.length > 0 || guardians.length > 0 || staffPicked.length > 0
  const isValid = subject.trim() && body.trim() && hasAnyChannel && hasAnyRecipientCriteria

  const toggleGrade = (id: number) => {
    setGradeIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))
  }
  const toggleSection = (id: number) => {
    setClassSectionIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleSend = () => {
    if (!isValid) return
    const total = preview?.total ?? 0
    if (
      !window.confirm(
        `Send this message to ${total} recipient${total !== 1 ? 's' : ''} via ${[
          channelSms && 'SMS',
          channelEmail && 'Email',
          channelPush && 'Push',
        ].filter(Boolean).join(', ')}?`,
      )
    )
      return

    sendMutation.mutate(
      { ...criteria, subject: subject.trim(), body: body.trim(), channelSms, channelEmail, channelPush },
      {
        onSuccess: (data) => {
          showNotification({
            variant: 'success',
            message: `Message sent to ${data.recipientCount} recipient(s).`,
          })
          setSubject('')
          setBody('')
          setAllParents(false)
          setAllTeachers(false)
          setGradeIds([])
          setClassSectionIds([])
          setGuardians([])
          setStaffPicked([])
        },
        onError: (err) => showNotification({ variant: 'danger', message: ApiErrorMessage(err) }),
      },
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#0d6efd,#0a58ca)' }}
          >
            <Send size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Targeted Message</h4>
            <p className="mb-0 text-muted small">
              Compose one message and choose exactly which parents and/or teachers receive it
            </p>
          </div>
        </div>
        <Link href="/principal/targeted-message/history" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
          <History size={14} /> Message History
        </Link>
      </div>

      {/* Section A — Recipient Selection */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-4 bg-white">
          <span className="fw-bold d-flex align-items-center gap-2"><Users size={16} /> Recipient Selection</span>
        </div>
        <div className="card-body p-4">
          <div className="d-flex gap-4 mb-3 flex-wrap">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="allParents" checked={allParents} onChange={(e) => setAllParents(e.target.checked)} />
              <label className="form-check-label small fw-semibold" htmlFor="allParents">All Parents</label>
            </div>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="allTeachers" checked={allTeachers} onChange={(e) => setAllTeachers(e.target.checked)} />
              <label className="form-check-label small fw-semibold" htmlFor="allTeachers">All Teachers</label>
            </div>
          </div>

          {!allParents && !allTeachers && (
            <>
              <div className="row g-4 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-2">By Grade</label>
                  <div className="d-flex flex-wrap gap-2">
                    {grades.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`btn btn-sm ${gradeIds.includes(g.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => toggleGrade(g.id)}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-2">By Class Section</label>
                  <div className="d-flex flex-wrap gap-2" style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {sections.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`btn btn-sm ${classSectionIds.includes(s.id) ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => toggleSection(s.id)}
                      >
                        {s.grade?.name ? `${s.grade.name} ${s.name}` : s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-2">Individual Parent</label>
                  <GuardianPicker
                    selected={guardians}
                    onAdd={(p) => setGuardians((prev) => [...prev, p])}
                    onRemove={(id) => setGuardians((prev) => prev.filter((g) => g.id !== id))}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold mb-2">Individual Teacher</label>
                  <StaffPicker
                    selected={staffPicked}
                    onAdd={(p) => setStaffPicked((prev) => [...prev, p])}
                    onRemove={(id) => setStaffPicked((prev) => prev.filter((s) => s.id !== id))}
                  />
                </div>
              </div>
            </>
          )}

          <div
            className="rounded-3 d-flex align-items-center gap-2 px-3 py-2 mt-4"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
          >
            <Users size={16} color="#1d4ed8" />
            <span className="small fw-semibold" style={{ color: '#1d4ed8' }}>
              {previewMutation.isPending
                ? 'Calculating recipients…'
                : preview
                  ? `${preview.total} recipient${preview.total !== 1 ? 's' : ''} — ${preview.parentCount} parent(s), ${preview.teacherCount} teacher(s)`
                  : 'Select recipients to see a live count'}
            </span>
          </div>
        </div>
      </div>

      {/* Section B — Message */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-4 bg-white">
          <span className="fw-bold d-flex align-items-center gap-2"><MessageSquare size={16} /> Message</span>
        </div>
        <div className="card-body p-4">
          <div className="mb-3">
            <label className="form-label small fw-semibold">Subject</label>
            <input
              type="text"
              className="form-control"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Sports Day rescheduled"
            />
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Body</label>
            <textarea
              className="form-control"
              rows={5}
              maxLength={MAX_BODY_CHARS}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div className="text-muted small mt-1">{body.length}/{MAX_BODY_CHARS} characters</div>
          </div>
          <div className="d-flex gap-4 flex-wrap">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="chSms" checked={channelSms} onChange={(e) => setChannelSms(e.target.checked)} />
              <label className="form-check-label small d-flex align-items-center gap-1" htmlFor="chSms"><MessageSquare size={13} /> SMS</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="chEmail" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} />
              <label className="form-check-label small d-flex align-items-center gap-1" htmlFor="chEmail"><Mail size={13} /> Email</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="chPush" checked={channelPush} onChange={(e) => setChannelPush(e.target.checked)} />
              <label className="form-check-label small d-flex align-items-center gap-1" htmlFor="chPush"><Bell size={13} /> Push</label>
            </div>
          </div>
        </div>
      </div>

      {/* Section C — Preview + Confirm */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="small text-muted">
            {preview
              ? `Ready to send to ${preview.total} recipient(s) across ${[channelSms, channelEmail, channelPush].filter(Boolean).length} channel(s).`
              : 'Fill in the message and select recipients to send.'}
          </div>
          <button
            type="button"
            className="btn fw-bold text-white d-flex align-items-center gap-2"
            style={{
              background: isValid && !sendMutation.isPending ? 'linear-gradient(135deg,#0d6efd,#0a58ca)' : '#cbd5e1',
              border: 'none',
              padding: '10px 24px',
            }}
            disabled={!isValid || sendMutation.isPending}
            onClick={handleSend}
          >
            {sendMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" /> Sending…
              </>
            ) : (
              <>
                <Send size={15} /> Send Message
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TargetedMessagePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <TargetedMessageContent />
    </RoleGuard>
  )
}
