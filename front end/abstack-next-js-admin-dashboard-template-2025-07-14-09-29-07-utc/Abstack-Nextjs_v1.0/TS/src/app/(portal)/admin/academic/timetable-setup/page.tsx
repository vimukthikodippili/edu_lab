'use client'
import React, { useState } from 'react'
import { AlertTriangle, CalendarDays, CalendarCheck, ChevronRight, GraduationCap, Lock, Unlock, Users } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { GenerateTimetablePanel } from '@/features/timetable/components/GenerateTimetablePanel'
import { TimetableGrid } from '@/features/timetable/components/TimetableGrid'
import { DraggableTimetableGrid } from '@/features/timetable/components/DraggableTimetableGrid'
import { useClassSectionTimetable } from '@/features/timetable/hooks/useClassSectionTimetable'
import { useTeacherTimetable } from '@/features/timetable/hooks/useTeacherTimetable'
import { useTimetableRecord } from '@/features/timetable/hooks/useTimetableRecord'
import { useFinalizeTimetable } from '@/features/timetable/hooks/useFinalizeTimetable'
import { useUnlockTimetable } from '@/features/timetable/hooks/useUnlockTimetable'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import { useClassSectionRequirements } from '@/features/teacher-subject-requirements/hooks/useClassSectionRequirements'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useNotificationContext } from '@/context/useNotificationContext'
import { GradeStageBadge } from '@/features/grade-stages/components/GradeStageBadge'
import type { ClassSection } from '@/features/teacher-subject-requirements/types'

const CURRENT_YEAR = String(new Date().getFullYear())

type ViewMode = 'class' | 'teacher'

// ─── Finalization panel ───────────────────────────────────────────────────────

function FinalizationPanel({ academicYear }: { academicYear: string }) {
  const { showNotification } = useNotificationContext()
  const { data: record, isLoading: recordLoading } = useTimetableRecord(academicYear)
  const finalize = useFinalizeTimetable()
  const unlock = useUnlockTimetable()

  const isLocked = record?.isLocked ?? false

  async function handleFinalize() {
    try {
      const res = await finalize.mutateAsync({ academicYear })
      showNotification({
        variant: 'success',
        title: 'Timetable Finalized',
        message: `${res.teacherCount} teacher${res.teacherCount !== 1 ? 's' : ''} notified for ${academicYear}.`,
      })
    } catch (err: any) {
      showNotification({
        variant: 'danger',
        title: 'Finalization Failed',
        message: err?.response?.data?.message ?? err?.message ?? 'An error occurred.',
      })
    }
  }

  async function handleUnlock() {
    try {
      await unlock.mutateAsync({ academicYear })
      showNotification({
        variant: 'warning',
        title: 'Timetable Unlocked',
        message: `${academicYear} timetable is now editable again.`,
      })
    } catch (err: any) {
      showNotification({
        variant: 'danger',
        title: 'Unlock Failed',
        message: err?.response?.data?.message ?? err?.message ?? 'An error occurred.',
      })
    }
  }

  if (recordLoading) return null

  return (
    <div
      className="card border-0 shadow-sm mb-4"
      style={{ borderLeft: '4px solid ' + (isLocked ? '#16a34a' : '#667eea') + ' !important' }}
    >
      <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3 py-3">
        <div className="d-flex align-items-center gap-3">
          {isLocked ? (
            <Lock size={20} style={{ color: '#16a34a' }} />
          ) : (
            <CalendarCheck size={20} style={{ color: '#667eea' }} />
          )}
          <div>
            {isLocked && record?.finalizedAt ? (
              <>
                <div className="fw-semibold" style={{ color: '#15803d' }}>
                  Timetable Finalized
                </div>
                <div className="small text-muted">
                  Locked on{' '}
                  {new Date(record.finalizedAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                  {' '}· {academicYear}
                </div>
              </>
            ) : (
              <>
                <div className="fw-semibold">Ready to Finalize</div>
                <div className="small text-muted">
                  Finalizing will lock edits and notify all assigned teachers · {academicYear}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="d-flex gap-2">
          {isLocked ? (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
              onClick={handleUnlock}
              disabled={unlock.isPending}
            >
              <Unlock size={14} />
              {unlock.isPending ? 'Unlocking…' : 'Unlock for Edits'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-2 text-white"
              onClick={handleFinalize}
              disabled={finalize.isPending}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
            >
              <CalendarCheck size={14} />
              {finalize.isPending ? 'Finalizing…' : 'Finalize Timetable'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Class section selector panel ────────────────────────────────────────────

function ClassSelector({
  academicYear,
  selectedId,
  onSelect,
}: {
  academicYear: string
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const [gradeFilter, setGradeFilter] = useState<number | undefined>(undefined)
  const { data: sections = [], isLoading } = useClassSections({ academicYear: academicYear || undefined, gradeId: gradeFilter })

  return (
    <div>
      <div className="px-3 pt-3 pb-2">
        <select
          className="form-select form-select-sm"
          value={gradeFilter ?? ''}
          onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Grades</option>
          {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      <div className="list-group list-group-flush" style={{ maxHeight: 440, overflowY: 'auto' }}>
        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[1, 2, 3].map((i) => (
              <span key={i} className="placeholder col-12 rounded mb-2 d-block" style={{ height: 44 }} />
            ))}
          </div>
        )}
        {!isLoading && sections.length === 0 && (
          <div className="text-center text-muted py-4 small px-3">
            No class sections found for {academicYear}.
          </div>
        )}
        {sections.map((s: ClassSection) => (
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
              <div className="small fw-semibold" style={{ color: selectedId === s.id ? '#4338ca' : undefined }}>
                {s.grade.name} · Section {s.name}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.academicYear}</div>
            </div>
            <ChevronRight size={14} className="text-muted" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Teacher selector panel ───────────────────────────────────────────────────

function TeacherSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data: staffData, isLoading } = useStaff({ status: 'active', limit: 100 } as any)
  const staff = staffData?.data ?? []
  const filtered = staff.filter(
    (s: any) =>
      !search ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="px-3 pt-3 pb-2">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search teacher name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="list-group list-group-flush" style={{ maxHeight: 440, overflowY: 'auto' }}>
        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[1, 2, 3].map((i) => (
              <span key={i} className="placeholder col-12 rounded mb-2 d-block" style={{ height: 44 }} />
            ))}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-muted py-4 small px-3">No matching teachers found.</div>
        )}
        {filtered.map((s: any) => (
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
              <div className="small fw-semibold" style={{ color: selectedId === s.id ? '#4338ca' : undefined }}>
                {s.firstName} {s.lastName}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.employeeNumber}</div>
            </div>
            <ChevronRight size={14} className="text-muted" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Right panel: class timetable ────────────────────────────────────────────

function ClassTimetablePanel({ classSectionId, academicYear }: { classSectionId: number; academicYear: string }) {
  const { data = [], isLoading } = useClassSectionTimetable(classSectionId, academicYear)
  const { data: record } = useTimetableRecord(academicYear)
  const { data: reqData } = useClassSectionRequirements(classSectionId)
  const section = data[0]?.classSection ?? reqData?.classSection
  const isLocked = record?.isLocked ?? false
  const needsGeneration = !isLoading && data.length === 0 && (reqData?.requirements.length ?? 0) > 0

  return (
    <div>
      {section && (
        <div className="px-4 pt-3 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h6 className="mb-0 fw-bold">{section.grade.name} · Section {section.name}</h6>
            <span className="badge bg-light text-secondary border">{section.academicYear}</span>
            <GradeStageBadge level={section.grade.level} />
            {isLocked && (
              <span className="badge" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                Finalized
              </span>
            )}
          </div>
        </div>
      )}
      {needsGeneration && (
        <div className="px-4 pt-3">
          <div className="alert alert-warning d-flex align-items-center gap-2 py-2 small mb-0">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span>
              <strong>{reqData!.requirements.length} period requirement{reqData!.requirements.length !== 1 ? 's are' : ' is'}</strong> configured
              for this class, but no timetable has been generated yet — use <strong>Generate Timetable</strong> above to create one.
            </span>
          </div>
        </div>
      )}
      <div className="p-3">
        <DraggableTimetableGrid entries={data} isLoading={isLoading} isLocked={isLocked} />
      </div>
    </div>
  )
}

// ─── Right panel: teacher timetable ─────────────────────────────────────────

function TeacherTimetablePanel({ teacherId, academicYear }: { teacherId: string; academicYear: string }) {
  const { data = [], isLoading } = useTeacherTimetable(teacherId, academicYear)
  const teacher = data[0]?.teacher

  return (
    <div>
      {teacher && (
        <div className="px-4 pt-3 pb-2 border-bottom">
          <h6 className="mb-0 fw-bold">
            {teacher.firstName} {teacher.lastName}
          </h6>
          <div className="text-muted small">{teacher.employeeNumber}</div>
        </div>
      )}
      <div className="p-3">
        <TimetableGrid entries={data} isLoading={isLoading} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TimetableGeneratorContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('class')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const { data: selectedRequirements } = useClassSectionRequirements(selectedClassId)

  const hasSelection = viewMode === 'class' ? !!selectedClassId : !!selectedTeacherId

  return (
    <div className="container-fluid px-4 py-4">
      {/* Page header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <CalendarDays size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Timetable Generator</h4>
          <p className="text-muted small mb-0">
            Auto-generate a first-draft weekly timetable from configured period requirements.
          </p>
        </div>
      </div>

      {/* Generate panel */}
      <GenerateTimetablePanel
        academicYear={academicYear}
        onAcademicYearChange={setAcademicYear}
        initialGradeId={viewMode === 'class' ? selectedRequirements?.classSection.grade.id ?? null : null}
      />

      {/* Finalization panel */}
      <FinalizationPanel academicYear={academicYear} />

      {/* Two-panel viewer */}
      <div className="row g-4">
        {/* Left: selector */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div
              className="card-header border-0 py-0 px-0 rounded-top-3 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              {/* View mode tabs */}
              <div className="d-flex">
                <button
                  type="button"
                  onClick={() => setViewMode('class')}
                  className="flex-fill border-0 py-3 small fw-semibold"
                  style={{
                    background: 'transparent',
                    color: viewMode === 'class' ? '#fff' : 'rgba(255,255,255,0.6)',
                    borderBottom: viewMode === 'class' ? '2px solid #fff' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <GraduationCap size={13} className="me-1" />
                  By Class
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('teacher')}
                  className="flex-fill border-0 py-3 small fw-semibold"
                  style={{
                    background: 'transparent',
                    color: viewMode === 'teacher' ? '#fff' : 'rgba(255,255,255,0.6)',
                    borderBottom: viewMode === 'teacher' ? '2px solid #fff' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Users size={13} className="me-1" />
                  By Teacher
                </button>
              </div>
            </div>

            {/* Academic year filter (only shown in class mode) */}
            {viewMode === 'class' && (
              <div className="px-3 pt-3 pb-0">
                <div className="d-flex align-items-center gap-2">
                  <label className="form-label small fw-semibold mb-0 text-nowrap">Year:</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ maxWidth: 80 }}
                    value={academicYear}
                    onChange={(e) => {
                      setAcademicYear(e.target.value)
                      setSelectedClassId(null)
                    }}
                  />
                </div>
              </div>
            )}

            {viewMode === 'class' ? (
              <ClassSelector
                academicYear={academicYear}
                selectedId={selectedClassId}
                onSelect={setSelectedClassId}
              />
            ) : (
              <TeacherSelector selectedId={selectedTeacherId} onSelect={setSelectedTeacherId} />
            )}
          </div>
        </div>

        {/* Right: timetable grid */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-3"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <span className="fw-bold text-white">
                {viewMode === 'class' ? 'Class Timetable' : 'Teacher Schedule'}
              </span>
            </div>

            {!hasSelection ? (
              <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5 text-muted">
                <CalendarDays size={40} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">
                  {viewMode === 'class' ? 'Select a class section' : 'Select a teacher'}
                </p>
                <p className="small">
                  {viewMode === 'class'
                    ? 'Choose a class from the left panel to view its weekly timetable.'
                    : 'Choose a teacher from the left panel to view their weekly schedule.'}
                </p>
              </div>
            ) : viewMode === 'class' ? (
              <ClassTimetablePanel classSectionId={selectedClassId!} academicYear={academicYear} />
            ) : (
              <TeacherTimetablePanel teacherId={selectedTeacherId!} academicYear={academicYear} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TimetableGeneratorPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <TimetableGeneratorContent />
    </RoleGuard>
  )
}
