'use client'
import { useEffect, useState } from 'react'
import { Award, ChevronDown, ChevronUp, Users } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useMyClassTeacherSections } from '@/features/teacher-subject-requirements/hooks/useMyClassTeacherSections'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useStudentYearEndNotes } from '@/features/student-notes/hooks/useStudentYearEndNotes'
import { useUpsertStudentYearEndNote } from '@/features/student-notes/hooks/useUpsertStudentYearEndNote'
import { useMyPromotionRecommendations } from '@/features/students/hooks/useMyPromotionRecommendations'
import { useSubmitPromotionRecommendation } from '@/features/students/hooks/useSubmitPromotionRecommendation'
import type { PromotionRecommendation, PromotionRecommendationOutcome } from '@/features/students/types-promotion'

const CURRENT_YEAR = String(new Date().getFullYear())

const RECOMMENDATION_LABELS: Record<PromotionRecommendationOutcome, string> = {
  promote: 'Promote',
  repeat: 'Repeat this grade',
  graduate: 'Graduate',
}

type ApiError = { response?: { data?: { message?: string } } }

function extractErrorMessage(err: unknown, fallback: string): string {
  const message = (err as ApiError)?.response?.data?.message
  return message ?? fallback
}

function PromotionRecommendationForm({
  studentId,
  studentName,
  existing,
}: {
  studentId: string
  studentName: string
  existing: PromotionRecommendation | null
}) {
  const { showNotification } = useNotificationContext()
  const submit = useSubmitPromotionRecommendation()
  const [outcome, setOutcome] = useState<PromotionRecommendationOutcome>(existing?.outcome ?? 'promote')
  const [comment, setComment] = useState(existing?.comment ?? '')

  const handleSave = () => {
    submit.mutate(
      { studentId, academicYear: CURRENT_YEAR, outcome, comment: comment.trim() || undefined },
      {
        onSuccess: () => showNotification({ variant: 'success', message: `Recommendation saved for ${studentName}.` }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not save recommendation.') }),
      },
    )
  }

  return (
    <div className="border-top pt-2 mt-2">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="fw-semibold small">Year-End Recommendation</span>
        {existing && (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 11 }}>
            {RECOMMENDATION_LABELS[existing.outcome]} on file
          </span>
        )}
      </div>
      <div className="d-flex flex-column gap-2">
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 220 }}
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as PromotionRecommendationOutcome)}
        >
          <option value="promote">Promote</option>
          <option value="repeat">Repeat this grade</option>
          <option value="graduate">Graduate</option>
        </select>
        <textarea
          className="form-control form-control-sm"
          rows={2}
          placeholder="Optional comment for admin"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
            onClick={handleSave}
            disabled={submit.isPending}
          >
            {submit.isPending && <span className="spinner-border spinner-border-sm" />}
            Save Recommendation
          </button>
        </div>
      </div>
    </div>
  )
}

function StudentNoteRow({
  studentId,
  studentName,
  recommendation,
}: {
  studentId: string
  studentName: string
  recommendation: PromotionRecommendation | null
}) {
  const { showNotification } = useNotificationContext()
  const [expanded, setExpanded] = useState(false)
  const { data: notes, isLoading } = useStudentYearEndNotes(studentId)
  const upsert = useUpsertStudentYearEndNote(studentId)

  const existingNote = notes?.find((n) => n.academicYear === CURRENT_YEAR) ?? null
  const [position, setPosition] = useState('')
  const [activities, setActivities] = useState('')
  const [remarks, setRemarks] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (expanded && !hydrated && !isLoading) {
      setPosition(existingNote?.position ?? '')
      setActivities(existingNote?.extracurricularActivities ?? '')
      setRemarks(existingNote?.generalRemarks ?? '')
      setHydrated(true)
    }
  }, [expanded, hydrated, isLoading, existingNote])

  const handleSave = () => {
    upsert.mutate(
      {
        academicYear: CURRENT_YEAR,
        position: position.trim() || undefined,
        extracurricularActivities: activities.trim() || undefined,
        generalRemarks: remarks.trim() || undefined,
      },
      {
        onSuccess: () => showNotification({ variant: 'success', message: `Note saved for ${studentName}.` }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not save note.') }),
      },
    )
  }

  return (
    <div className="border rounded-3 mb-2">
      <button
        type="button"
        className="btn w-100 d-flex align-items-center justify-content-between px-3 py-2 border-0 bg-transparent text-start"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="fw-semibold">{studentName}</span>
          {existingNote && (
            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: 11 }}>
              {CURRENT_YEAR} note saved
            </span>
          )}
          {recommendation ? (
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: 11 }}>
              {RECOMMENDATION_LABELS[recommendation.outcome]} recommended
            </span>
          ) : (
            <span className="badge bg-light text-muted border" style={{ fontSize: 11 }}>
              No recommendation yet
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {isLoading ? (
            <div className="text-muted small">Loading…</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              <div>
                <label className="form-label small fw-semibold mb-1">
                  Position / Role <span className="text-muted fw-normal">(e.g. Head Prefect, Games Captain)</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="form-label small fw-semibold mb-1">Extracurricular Activities</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label small fw-semibold mb-1">General Remarks / Conduct</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                  onClick={handleSave}
                  disabled={upsert.isPending}
                >
                  {upsert.isPending && <span className="spinner-border spinner-border-sm" />}
                  Save Note
                </button>
              </div>
              <PromotionRecommendationForm studentId={studentId} studentName={studentName} existing={recommendation} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClassTeacherContent() {
  const { data: sections, isLoading: sectionsLoading } = useMyClassTeacherSections()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const activeSectionId = selectedId ?? sections?.[0]?.id ?? null
  const { data: roster, isLoading: rosterLoading } = useStudents(
    activeSectionId ? { classSectionId: activeSectionId, limit: 100 } : {},
  )
  const { data: recommendations } = useMyPromotionRecommendations(CURRENT_YEAR)
  const recommendationsByStudent = new Map((recommendations ?? []).map((r) => [r.studentId, r]))

  if (sectionsLoading) {
    return <div className="text-muted">Loading…</div>
  }

  if (!sections?.length) {
    return (
      <div className="text-center text-muted py-5">
        <Award size={32} className="mb-2 opacity-50" />
        <p className="mb-0">You are not currently assigned as a class teacher for any section.</p>
      </div>
    )
  }

  return (
    <>
      {sections.length > 1 && (
        <div className="mb-3" style={{ maxWidth: 280 }}>
          <select
            className="form-select form-select-sm"
            value={activeSectionId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.grade.name} · Section {s.name} ({s.academicYear})
              </option>
            ))}
          </select>
        </div>
      )}

      {rosterLoading ? (
        <div className="text-muted">Loading roster…</div>
      ) : !roster?.data.length ? (
        <div className="text-muted">No active students in this section.</div>
      ) : (
        roster.data.map((student) => (
          <StudentNoteRow
            key={student.id}
            studentId={student.id}
            studentName={`${student.firstName} ${student.lastName}`}
            recommendation={recommendationsByStudent.get(student.id) ?? null}
          />
        ))
      )}
    </>
  )
}

export default function ClassTeacherPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <Users size={24} className="text-primary" />
          <div>
            <h4 className="mb-0">My Class — Year-End Notes &amp; Recommendations</h4>
            <p className="text-muted small mb-0">
              Add a note for each student, and recommend whether they should promote, repeat, or graduate.
              Admin sees your recommendation but makes the final call when committing promotions.
            </p>
          </div>
        </div>
        <ClassTeacherContent />
      </div>
    </RoleGuard>
  )
}
