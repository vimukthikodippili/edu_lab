'use client'
import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyStudent } from '@/features/students/hooks/useMyStudent'
import { useClassSectionTimetable } from '@/features/timetable/hooks/useClassSectionTimetable'
import { TimetableGrid } from '@/features/timetable/components/TimetableGrid'

const CURRENT_YEAR = String(new Date().getFullYear())

function StudentTimetableContent() {
  const [academicYear, setAcademicYear] = useState(CURRENT_YEAR)
  const { data: myStudent, isLoading: studentLoading, error: studentError } = useMyStudent()
  const { data: entries = [], isLoading: ttLoading } = useClassSectionTimetable(
    myStudent?.classSection.id ?? null,
    academicYear,
  )

  if (studentLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 300 }} />
        </div>
      </div>
    )
  }

  if (studentError || !myStudent) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <CalendarCheck size={18} />
          <div>
            <strong>Student record not found.</strong> Your account is not yet linked to a student profile.
            Please contact your school administrator.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <CalendarCheck size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">My Timetable</h4>
            <p className="text-muted small mb-0">
              {myStudent.grade.name} — Section {myStudent.classSection.name}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0 small fw-semibold text-nowrap">Year:</label>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ width: 80 }}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <span className="fw-bold text-white">Weekly Schedule · {academicYear}</span>
        </div>
        <div className="p-3">
          {entries.length === 0 && !ttLoading ? (
            <div className="text-center text-muted py-5">
              <CalendarCheck size={36} className="mb-3 opacity-25" />
              <p className="fw-semibold mb-1">No schedule found</p>
              <p className="small">No timetable entries exist for {academicYear} yet.</p>
            </div>
          ) : (
            <TimetableGrid entries={entries} isLoading={ttLoading} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function StudentTimetablePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentTimetableContent />
    </RoleGuard>
  )
}
