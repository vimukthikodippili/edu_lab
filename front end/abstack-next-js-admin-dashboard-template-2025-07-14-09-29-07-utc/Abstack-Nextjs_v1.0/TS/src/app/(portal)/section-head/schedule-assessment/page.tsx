'use client'
import React, { useState } from 'react'
import { CalendarPlus, CheckCircle2, AlertCircle, Users, BookOpenCheck } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useClassSectionRequirements } from '@/features/teacher-subject-requirements/hooks/useClassSectionRequirements'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useCreateAssessment } from '@/features/grades/hooks/useCreateAssessment'
import TopicAllocationEditor, {
  type TopicAllocation,
} from '@/features/subject-topics/components/TopicAllocationEditor'
import type { TeacherSubjectClassRequirement } from '@/features/teacher-subject-requirements/types'
import type { AssessmentType } from '@/types/sims/grades'
import { ASSESSMENT_TYPE_LABELS } from '@/types/sims/grades'

const CURRENT_YEAR = String(new Date().getFullYear())

function AssignmentPicker({
  requirements,
  isLoading,
  selectedId,
  onSelect,
}: {
  requirements: TeacherSubjectClassRequirement[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (r: TeacherSubjectClassRequirement) => void
}) {
  if (isLoading) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-12 rounded d-block mb-2" style={{ height: 52 }} />
        <span className="placeholder col-12 rounded d-block" style={{ height: 52 }} />
      </div>
    )
  }
  if (requirements.length === 0) {
    return (
      <div className="rounded-3 p-3 d-flex align-items-center gap-2" style={{ background: '#fff7ed', color: '#c2410c' }}>
        <AlertCircle size={16} className="flex-shrink-0" />
        <span className="small">No subject/teacher assignments configured for this class yet — add one in Period Requirements first.</span>
      </div>
    )
  }
  return (
    <div className="d-flex flex-column gap-2">
      {requirements.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="btn text-start d-flex align-items-center justify-content-between gap-3 px-3 py-2"
          style={{
            border: `1.5px solid ${selectedId === r.id ? 'var(--edulab-accent)' : 'var(--edulab-border)'}`,
            background: selectedId === r.id ? 'var(--edulab-accent-soft, #ede9fe)' : '#fff',
            borderRadius: 12,
          }}
        >
          <span className="d-flex align-items-center gap-2">
            <BookOpenCheck size={15} style={{ color: 'var(--edulab-accent)' }} />
            <span className="fw-semibold small">{r.subject.name}</span>
          </span>
          <span className="d-flex align-items-center gap-2 text-muted small">
            <Users size={13} />
            {r.teacher.firstName} {r.teacher.lastName}
          </span>
        </button>
      ))}
    </div>
  )
}

function ScheduleAssessmentContent() {
  const [gradeId, setGradeId] = useState('')
  const [classSectionId, setClassSectionId] = useState('')
  const [selectedRequirement, setSelectedRequirement] = useState<TeacherSubjectClassRequirement | null>(null)

  const [termId, setTermId] = useState('')
  const [title, setTitle] = useState('')
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('term_test')
  const [scheduledDate, setScheduledDate] = useState('')
  const [topicAllocations, setTopicAllocations] = useState<TopicAllocation[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: grades = [] } = useGrades()
  const { data: classSections = [] } = useClassSections({ gradeId: gradeId ? Number(gradeId) : undefined, academicYear: CURRENT_YEAR })
  const { data: requirementsData, isLoading: requirementsLoading } = useClassSectionRequirements(
    classSectionId ? Number(classSectionId) : null,
  )
  const { data: terms = [] } = useAcademicTerms()
  const createMutation = useCreateAssessment()

  const handleSelectClassSection = (id: string) => {
    setClassSectionId(id)
    setSelectedRequirement(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!selectedRequirement) {
      setError('Select a subject/teacher assignment first.')
      return
    }
    if (topicAllocations.length === 0) {
      setError('Allocate at least one topic a mark before scheduling.')
      return
    }
    try {
      await createMutation.mutateAsync({
        subjectId: selectedRequirement.subjectId,
        termId: Number(termId),
        classSectionId: selectedRequirement.classSectionId,
        title,
        assessmentType,
        scheduledDate,
        topicAllocations,
        sectionHeadOverride: true,
      })
      setSuccess(true)
      setTitle('')
      setScheduledDate('')
      setTopicAllocations([])
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={CalendarPlus}
        title="Schedule an Assessment"
        subtitle="Set topics and mark allocation — the assigned teacher is notified automatically."
      />

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-4"
              style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
            >
              <span className="fw-bold text-white">1. Pick a Class</span>
            </div>
            <div className="card-body p-4">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Grade</label>
                  <select
                    className="form-select form-select-sm"
                    value={gradeId}
                    onChange={(e) => { setGradeId(e.target.value); handleSelectClassSection('') }}
                  >
                    <option value="">Select grade…</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold mb-1">Section</label>
                  <select
                    className="form-select form-select-sm"
                    value={classSectionId}
                    disabled={!gradeId}
                    onChange={(e) => handleSelectClassSection(e.target.value)}
                  >
                    <option value="">Select section…</option>
                    {classSections.map((cs) => (
                      <option key={cs.id} value={cs.id}>{cs.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {classSectionId && (
                <>
                  <label className="form-label small fw-semibold mb-2">Subject &amp; Teacher</label>
                  <AssignmentPicker
                    requirements={requirementsData?.requirements ?? []}
                    isLoading={requirementsLoading}
                    selectedId={selectedRequirement?.id ?? null}
                    onSelect={setSelectedRequirement}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-4"
              style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
            >
              <span className="fw-bold text-white">2. Assessment Details</span>
            </div>
            <div className="card-body p-4">
              {!selectedRequirement ? (
                <div className="text-center text-muted py-5">
                  <CalendarPlus size={36} className="mb-3 opacity-25" />
                  <p className="mb-0 small">Pick a class and a subject/teacher on the left to continue.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {success && (
                    <div className="alert alert-success d-flex align-items-center gap-2 py-2">
                      <CheckCircle2 size={16} /> Assessment scheduled — {selectedRequirement.teacher.firstName} has been notified.
                    </div>
                  )}
                  {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <div className="rounded-3 p-3 mb-3 d-flex align-items-center gap-2" style={{ background: '#f8fafc' }}>
                    <Users size={15} style={{ color: 'var(--edulab-accent)' }} />
                    <span className="small">
                      Scheduling for <strong>{selectedRequirement.subject.name}</strong> ·{' '}
                      {selectedRequirement.teacher.firstName} {selectedRequirement.teacher.lastName}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Academic Term</label>
                    <select className="form-select" value={termId} onChange={(e) => setTermId(e.target.value)} required>
                      <option value="">Select term…</option>
                      {terms.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Term Test 1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      maxLength={120}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Type</label>
                      <select
                        className="form-select"
                        value={assessmentType}
                        onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
                      >
                        {(Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((k) => (
                          <option key={k} value={k}>{ASSESSMENT_TYPE_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <TopicAllocationEditor
                    subjectId={selectedRequirement.subjectId}
                    teacherId={selectedRequirement.teacherId}
                    onAllocationsChange={setTopicAllocations}
                    showQuestionType
                  />

                  <button
                    type="submit"
                    className="btn text-white fw-semibold px-4 mt-2"
                    style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
                    disabled={createMutation.isPending || topicAllocations.length === 0 || !termId}
                  >
                    {createMutation.isPending ? 'Scheduling…' : 'Schedule & Notify Teacher'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ScheduleAssessmentPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECTION_HEAD]}>
      <ScheduleAssessmentContent />
    </RoleGuard>
  )
}
