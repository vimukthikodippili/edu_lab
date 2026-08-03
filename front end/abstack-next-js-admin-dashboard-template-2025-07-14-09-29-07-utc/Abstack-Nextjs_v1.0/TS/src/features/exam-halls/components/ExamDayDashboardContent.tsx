'use client'
import { useState } from 'react'
import { ClipboardList, Users } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import { useDayDashboard } from '../hooks/useDayDashboard'

export function ExamDayDashboardContent() {
  const { data: exams, isLoading: examsLoading } = useExams()
  const [selectedExamId, setSelectedExamId] = useState('')
  const { data: rows, isLoading: dashboardLoading } = useDayDashboard(selectedExamId || null)

  const selectedExam = exams?.find((e) => e.id === selectedExamId)
  const totalStudents = (rows ?? []).reduce((sum, r) => sum + r.studentCount, 0)

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <ClipboardList size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Exam Day Dashboard</h4>
          <p className="text-muted small mb-0">Every hall in use for an exam, its invigilators, and student counts, at a glance.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <label className="form-label small fw-semibold">Select Exam</label>
          <select className="form-select" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} disabled={examsLoading}>
            <option value="">{examsLoading ? 'Loading…' : 'Choose an exam…'}</option>
            {exams?.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.date}</option>)}
          </select>
        </div>
      </div>

      {selectedExam && (
        <div className="card border-0 shadow-sm">
          <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <span className="fw-bold text-white d-flex align-items-center gap-2">
              <Users size={16} /> {selectedExam.name} — {rows?.length ?? 0} Hall(s), {totalStudents} Student(s)
            </span>
          </div>
          <div className="card-body p-0">
            {dashboardLoading ? (
              <div className="p-4 text-muted small">Loading…</div>
            ) : !rows?.length ? (
              <div className="p-5 text-center text-muted">
                <ClipboardList size={36} className="mb-2 opacity-25" />
                <p className="mb-0">No halls have been allocated for this exam yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Hall</th>
                      <th>Invigilators</th>
                      <th>Students</th>
                      <th>Start</th>
                      <th className="pe-4">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.hallId}>
                        <td className="ps-4 small fw-semibold">{row.hallName}</td>
                        <td className="small">
                          {row.invigilatorNames.length ? row.invigilatorNames.join(', ') : <span className="text-muted">None assigned</span>}
                        </td>
                        <td className="small">{row.studentCount}</td>
                        <td className="small">{row.startTime}</td>
                        <td className="pe-4 small">{row.endTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
