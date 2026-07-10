'use client'
import React, { useState } from 'react'
import { ClipboardList, ChevronRight, Plus, GraduationCap } from 'lucide-react'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useClassSectionRequirements } from '@/features/teacher-subject-requirements/hooks/useClassSectionRequirements'
import { useCreateClassSection } from '@/features/teacher-subject-requirements/hooks/useCreateClassSection'
import { useAssignClassTeacher } from '@/features/teacher-subject-requirements/hooks/useAssignClassTeacher'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { AllocationBar } from '@/features/teacher-subject-requirements/components/AllocationBar'
import { RequirementRow } from '@/features/teacher-subject-requirements/components/RequirementRow'
import { AddRequirementForm } from '@/features/teacher-subject-requirements/components/AddRequirementForm'
import type { ClassSection } from '@/features/teacher-subject-requirements/types'
import type { StaffMember } from '@/features/staff/types'

const CURRENT_YEAR = String(new Date().getFullYear())

// ─── Add Class Section Modal ──────────────────────────────────────────────────

function AddSectionModal({ onClose }: { onClose: () => void }) {
  const { data: grades = [] } = useGrades()
  const create = useCreateClassSection()

  const [gradeId, setGradeId] = useState('')
  const [name, setName] = useState('')
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      await create.mutateAsync({
        gradeId: Number(gradeId),
        name: name.trim(),
        academicYear: academicYear.trim(),
      })
      onClose()
    } catch (err: any) {
      const raw = err?.response?.data?.message ?? 'Failed to create class section.'
      setErrorMsg(typeof raw === 'string' ? raw : JSON.stringify(raw))
    }
  }

  return (
    <div
      className="modal d-flex align-items-center justify-content-center"
      style={{ display: 'flex !important', background: 'rgba(0,0,0,0.45)', position: 'fixed', inset: 0, zIndex: 1055 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered mb-0" style={{ maxWidth: 420, width: '95%' }}>
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div
            className="d-flex align-items-center justify-content-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <span className="fw-bold text-white">Add Class Section</span>
            <button className="btn-close btn-close-white btn-sm" onClick={onClose} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body px-4 py-3 d-flex flex-column gap-3">
              {errorMsg && (
                <div className="alert alert-danger py-2 small mb-0">{errorMsg}</div>
              )}

              {/* Grade */}
              <div>
                <label className="form-label small fw-semibold mb-1">Grade</label>
                <select
                  className="form-select form-select-sm"
                  value={gradeId}
                  required
                  onChange={(e) => setGradeId(e.target.value)}
                >
                  <option value="">— Select grade —</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section name */}
              <div>
                <label className="form-label small fw-semibold mb-1">
                  Section Name
                  <span className="text-muted fw-normal ms-1">(e.g. A, B, Science, Arts)</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="A"
                  maxLength={10}
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Academic year */}
              <div>
                <label className="form-label small fw-semibold mb-1">Academic Year</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="2026"
                  maxLength={4}
                  minLength={4}
                  pattern="\d{4}"
                  value={academicYear}
                  required
                  onChange={(e) => setAcademicYear(e.target.value)}
                />
              </div>

              {/* Preview */}
              {gradeId && name && (
                <div
                  className="rounded-2 px-3 py-2 small text-muted d-flex align-items-center gap-2"
                  style={{ background: '#f0f2ff', border: '1px solid #c7d2fe' }}
                >
                  <span style={{ color: '#4338ca' }}>Preview:</span>
                  <strong style={{ color: '#4338ca' }}>
                    {grades.find((g) => g.id === Number(gradeId))?.name} · {name} · {academicYear}
                  </strong>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 px-4 pb-4 pt-0 d-flex gap-2 justify-content-end">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                disabled={create.isPending}
              >
                {create.isPending ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <Plus size={13} />
                )}
                Create Section
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Section List ─────────────────────────────────────────────────────────────

function SectionList({
  sections,
  staffById,
  selectedId,
  onSelect,
  onAdd,
}: {
  sections: ClassSection[]
  staffById: Map<string, StaffMember>
  selectedId: number | null
  onSelect: (id: number) => void
  onAdd: () => void
}) {
  return (
    <div>
      <div className="list-group list-group-flush" style={{ maxHeight: 440, overflowY: 'auto' }}>
        {sections.length === 0 && (
          <div className="text-center text-muted py-4 small px-3">
            No class sections found. Create one with the button below.
          </div>
        )}
        {sections.map((s) => {
          const classTeacher = s.classTeacherStaffId ? staffById.get(s.classTeacherStaffId) : null
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 border-0"
              style={
                selectedId === s.id
                  ? { borderLeft: '3px solid #667eea', background: '#f0f2ff' }
                  : { borderLeft: '3px solid transparent' }
              }
            >
              <div>
                <div
                  className="small fw-semibold"
                  style={{ color: selectedId === s.id ? '#4338ca' : undefined }}
                >
                  {s.grade.name} · Section {s.name}
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  {s.academicYear}
                </div>
                <div
                  className="d-flex align-items-center gap-1"
                  style={{ fontSize: '0.72rem' }}
                >
                  <GraduationCap size={11} className={classTeacher ? 'text-primary' : 'text-muted'} />
                  {classTeacher ? (
                    <span className="text-primary">{classTeacher.firstName} {classTeacher.lastName}</span>
                  ) : (
                    <span className="text-muted fst-italic">Unassigned</span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
          )
        })}
      </div>

      {/* Add section button at bottom */}
      <div className="p-3 border-top">
        <button
          className="btn btn-sm btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={onAdd}
        >
          <Plus size={14} />
          Add Class Section
        </button>
      </div>
    </div>
  )
}

// ─── Requirements Panel ───────────────────────────────────────────────────────

function ClassTeacherControl({
  classSection,
  staffOptions,
}: {
  classSection: ClassSection
  staffOptions: StaffMember[]
}) {
  const assignClassTeacher = useAssignClassTeacher()
  const [value, setValue] = useState(classSection.classTeacherStaffId ?? '')

  const handleChange = (staffId: string) => {
    setValue(staffId)
    assignClassTeacher.mutate({ classSectionId: classSection.id, staffId: staffId || null })
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <GraduationCap size={14} className="text-muted flex-shrink-0" />
      <label className="small text-muted fw-semibold mb-0 flex-shrink-0">Class Teacher</label>
      <select
        className="form-select form-select-sm"
        style={{ maxWidth: 240 }}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={assignClassTeacher.isPending}
      >
        <option value="">— Unassigned —</option>
        {staffOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.firstName} {s.lastName}
          </option>
        ))}
      </select>
      {assignClassTeacher.isPending && <span className="spinner-border spinner-border-sm text-muted" />}
    </div>
  )
}

function RequirementsPanel({
  classSectionId,
  staffOptions,
}: {
  classSectionId: number
  staffOptions: StaffMember[]
}) {
  const { data, isLoading, isError } = useClassSectionRequirements(classSectionId)
  const [errorMsg, setErrorMsg] = useState('')

  if (isLoading) {
    return (
      <div className="p-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="placeholder-glow mb-2">
            <span className="placeholder col-12 rounded" style={{ height: 40 }} />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="alert alert-danger m-3">Failed to load requirements. Please try again.</div>
    )
  }

  const { classSection, totalWeeklySlots, allocatedPeriods, availablePeriods, requirements } = data

  return (
    <div>
      {/* Section subheader */}
      <div className="px-4 pt-3 pb-2 border-bottom">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
          <h6 className="mb-0 fw-bold">
            {classSection.grade.name} · Section {classSection.name}
          </h6>
          <span className="badge bg-light text-secondary border">{classSection.academicYear}</span>
          <span className="badge bg-light text-muted border">
            {classSection.grade.stage.replace(/_/g, ' ')}
          </span>
        </div>
        <ClassTeacherControl classSection={classSection} staffOptions={staffOptions} />
      </div>

      {/* Allocation bar */}
      <div className="px-4 py-3">
        <AllocationBar
          allocated={allocatedPeriods}
          total={totalWeeklySlots}
          available={availablePeriods}
        />
      </div>

      {/* Error from row actions */}
      {errorMsg && (
        <div className="alert alert-danger alert-dismissible mx-4 py-2 small">
          {errorMsg}
          <button type="button" className="btn-close btn-sm" onClick={() => setErrorMsg('')} />
        </div>
      )}

      {/* Requirements table */}
      <div className="px-4">
        {requirements.length === 0 ? (
          <div className="text-center py-4 text-muted small">
            No requirements configured yet. Add one below.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr className="table-light">
                  <th className="small text-muted fw-semibold">Teacher</th>
                  <th className="small text-muted fw-semibold">Code</th>
                  <th className="small text-muted fw-semibold">Subject</th>
                  <th className="small text-muted fw-semibold text-center">Periods/Week</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <RequirementRow
                    key={req.id}
                    req={req}
                    classSectionId={classSectionId}
                    onError={setErrorMsg}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AddRequirementForm
          classSectionId={classSectionId}
          availablePeriods={availablePeriods}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PeriodRequirementsPage() {
  const [gradeFilter, setGradeFilter] = useState<number | undefined>(undefined)
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: sections = [], isLoading: sectionsLoading } = useClassSections({
    gradeId: gradeFilter,
    academicYear: yearFilter || undefined,
  })
  const { data: staffData } = useStaff({ status: 'active', limit: 100 } as any)
  const staffOptions = staffData?.data ?? []
  const staffById = new Map(staffOptions.map((s) => [s.id, s]))

  return (
    <div className="container-fluid px-4 py-4">
      {/* Add section modal */}
      {showAddModal && <AddSectionModal onClose={() => setShowAddModal(false)} />}

      {/* Page header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <ClipboardList size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Period Requirements</h4>
          <p className="text-muted small mb-0">
            Configure required periods per week for each teacher-subject-class combination.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left: class section list */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <span className="fw-bold text-white">Class Sections</span>
              <button
                className="btn btn-sm btn-light d-flex align-items-center gap-1"
                style={{ fontSize: '0.75rem', padding: '2px 10px' }}
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={12} /> New
              </button>
            </div>

            {/* Filters */}
            <div className="px-3 pt-3 pb-2">
              <div className="row g-2">
                <div className="col-7">
                  <select
                    className="form-select form-select-sm"
                    value={gradeFilter ?? ''}
                    onChange={(e) => {
                      setGradeFilter(e.target.value ? Number(e.target.value) : undefined)
                      setSelectedId(null)
                    }}
                  >
                    <option value="">All Grades</option>
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-5">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Year"
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value)
                      setSelectedId(null)
                    }}
                  />
                </div>
              </div>
            </div>

            {sectionsLoading ? (
              <div className="p-3 placeholder-glow">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="placeholder col-12 rounded mb-2 d-block"
                    style={{ height: 44 }}
                  />
                ))}
              </div>
            ) : (
              <SectionList
                sections={sections}
                staffById={staffById}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={() => setShowAddModal(true)}
              />
            )}
          </div>
        </div>

        {/* Right: requirements panel */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-3"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <span className="fw-bold text-white">
                {selectedId ? 'Class Requirements' : 'Period Requirements'}
              </span>
            </div>

            {selectedId === null ? (
              <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5 text-muted">
                <ClipboardList size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">Select a class section</p>
                <p className="small">
                  Choose a section from the left panel to configure its period requirements.
                </p>
                <button
                  className="btn btn-sm btn-outline-primary mt-2 d-flex align-items-center gap-2"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={13} /> Add Class Section
                </button>
              </div>
            ) : (
              <RequirementsPanel classSectionId={selectedId} staffOptions={staffOptions} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
