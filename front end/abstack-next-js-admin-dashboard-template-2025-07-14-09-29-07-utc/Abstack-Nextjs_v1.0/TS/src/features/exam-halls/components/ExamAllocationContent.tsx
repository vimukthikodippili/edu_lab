'use client'
import { useState } from 'react'
import { CalendarDays, Shuffle, Users, X, Plus, Edit3, UserCheck, FileDown, FileText } from 'lucide-react'
import { useExams } from '../hooks/useExams'
import { useCreateExam } from '../hooks/useCreateExam'
import { useAutoAllocateSeats } from '../hooks/useAutoAllocateSeats'
import { useSeatAllocations } from '../hooks/useSeatAllocations'
import { useOverrideSeat } from '../hooks/useOverrideSeat'
import { useExamHalls } from '../hooks/useExamHalls'
import { useExamHall } from '../hooks/useExamHall'
import { useInvigilators } from '../hooks/useInvigilators'
import { useAssignInvigilators } from '../hooks/useAssignInvigilators'
import { useDownloadSeatingPlanPdf } from '../hooks/useDownloadSeatingPlanPdf'
import { useDownloadEntryListPdf } from '../hooks/useDownloadEntryListPdf'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useGrades } from '@/features/students/hooks/useGrades'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { EXAM_TYPE_LABELS, type ExamType } from '@/types/sims/exam-halls'
import { useNotificationContext } from '@/context/useNotificationContext'

const EXAM_TYPES = Object.keys(EXAM_TYPE_LABELS) as ExamType[]

function HallInvigilatorPanel({ examId, examHallId, hallName }: { examId: string; examHallId: string; hallName: string }) {
  const { data: invigilators } = useInvigilators(examId)
  const assign = useAssignInvigilators()
  const seatingPdf = useDownloadSeatingPlanPdf()
  const entryPdf = useDownloadEntryListPdf()
  const { showNotification } = useNotificationContext()
  const [search, setSearch] = useState('')
  const { data: staffResults } = useStaff({ search, limit: 8 })
  const [pending, setPending] = useState<{ id: string; name: string }[]>([])

  const hallInvigilators = (invigilators ?? []).filter((r) => r.invigilator.examHallId === examHallId)

  const handleAdd = (id: string, name: string) => {
    setPending((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, { id, name }]))
    setSearch('')
  }

  const handleAssign = () => {
    if (!pending.length) return
    assign.mutate(
      { examId, examHallId, payload: { staffIds: pending.map((p) => p.id) } },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Invigilators assigned and notified.' })
          setPending([])
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not assign invigilators.' }),
      },
    )
  }

  return (
    <div className="border rounded-3 p-3 mb-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <h6 className="fw-bold mb-0">{hallName}</h6>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            disabled={seatingPdf.isDownloading}
            onClick={() => seatingPdf.download(examId, examHallId, hallName)}
          >
            <FileDown size={14} /> Seating Plan PDF
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            disabled={entryPdf.isDownloading}
            onClick={() => entryPdf.download(examId, examHallId, hallName)}
          >
            <FileText size={14} /> Entry List PDF
          </button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-2">
        {hallInvigilators.length === 0 && <span className="text-muted small">No invigilators assigned yet.</span>}
        {hallInvigilators.map((r) => (
          <span key={r.invigilator.id} className="badge bg-light text-dark border px-2 py-2">{r.staffName}</span>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-2">
          {pending.map((p) => (
            <span key={p.id} className="badge bg-primary-subtle text-primary-emphasis border d-flex align-items-center gap-1 px-2 py-2">
              {p.name}
              <X size={12} role="button" onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))} />
            </span>
          ))}
        </div>
      )}

      <div className="input-group input-group-sm" style={{ maxWidth: 320 }}>
        <input type="text" className="form-control" placeholder="Search staff by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {search.trim() && (
        <div className="list-group mt-1" style={{ maxWidth: 320 }}>
          {(staffResults?.data ?? []).map((s) => (
            <button key={s.id} type="button" className="list-group-item list-group-item-action small" onClick={() => handleAdd(s.id, `${s.firstName} ${s.lastName}`)}>
              {s.firstName} {s.lastName} — {s.designation}
            </button>
          ))}
          {!(staffResults?.data ?? []).length && <div className="list-group-item small text-muted">No matches.</div>}
        </div>
      )}

      <button type="button" className="btn btn-sm btn-primary mt-2 d-flex align-items-center gap-1" disabled={!pending.length || assign.isPending} onClick={handleAssign}>
        <UserCheck size={14} /> {assign.isPending ? 'Assigning…' : 'Assign Invigilators'}
      </button>
    </div>
  )
}

function OverrideModal({ examId, allocationId, onClose }: { examId: string; allocationId: string; onClose: () => void }) {
  const { data: halls } = useExamHalls()
  const [hallId, setHallId] = useState('')
  const { data: hallDetail } = useExamHall(hallId || null)
  const [seatId, setSeatId] = useState('')
  const override = useOverrideSeat()
  const { showNotification } = useNotificationContext()

  const handleSave = () => {
    if (!seatId) return
    override.mutate(
      { examId, allocationId, payload: { examSeatId: seatId } },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: 'Seat reassigned.' })
          onClose()
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not reassign this seat.' }),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2"><Edit3 size={18} /> Override Seat</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body d-flex flex-column gap-3">
              <div>
                <label className="form-label small fw-semibold">Hall</label>
                <select className="form-select" value={hallId} onChange={(e) => { setHallId(e.target.value); setSeatId('') }}>
                  <option value="">Select a hall…</option>
                  {halls?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              {hallId && (
                <div>
                  <label className="form-label small fw-semibold">Seat</label>
                  <select className="form-select" value={seatId} onChange={(e) => setSeatId(e.target.value)}>
                    <option value="">Select a seat…</option>
                    {hallDetail?.seats.map((s) => <option key={s.id} value={s.id}>{s.seatLabel}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!seatId || override.isPending} onClick={handleSave}>
                {override.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ExamAllocationContent() {
  const { data: exams, isLoading: examsLoading } = useExams()
  const { data: subjects } = useSubjects({ limit: 100 })
  const { data: grades } = useGrades()
  const createExam = useCreateExam()
  const autoAllocate = useAutoAllocateSeats()
  const { showNotification } = useNotificationContext()

  const [showCreateExam, setShowCreateExam] = useState(false)
  const [examName, setExamName] = useState('')
  const [examType, setExamType] = useState<ExamType>('term_test')
  const [subjectId, setSubjectId] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:30')
  const [endTime, setEndTime] = useState('11:30')
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()))

  const [selectedExamId, setSelectedExamId] = useState('')
  const { data: allocations, isLoading: allocationsLoading } = useSeatAllocations(selectedExamId || null)
  const [mixClasses, setMixClasses] = useState(true)
  const [specialNeeds, setSpecialNeeds] = useState<{ id: string; name: string }[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null)

  const selectedExam = exams?.find((e) => e.id === selectedExamId)

  const handleCreateExam = () => {
    if (!examName.trim() || !subjectId || !gradeId || !date) {
      showNotification({ variant: 'danger', message: 'Name, subject, grade, and date are required.' })
      return
    }
    createExam.mutate(
      { name: examName.trim(), examType, subjectId, gradeId: Number(gradeId), date, startTime, endTime, academicYear },
      {
        onSuccess: (exam) => {
          showNotification({ variant: 'success', message: `${exam.name} created.` })
          setShowCreateExam(false)
          setExamName('')
          setSelectedExamId(exam.id)
        },
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not create this exam.' }),
      },
    )
  }

  const handleAllocate = () => {
    if (!selectedExamId) return
    autoAllocate.mutate(
      { examId: selectedExamId, payload: { mixClasses, specialNeedsStudentIds: specialNeeds.map((s) => s.id) } },
      {
        onSuccess: (result) =>
          result.allocatedCount === 0
            ? showNotification({
                variant: 'warning',
                message: 'No students were allocated — check that students are enrolled in this exam\'s subject and are active in this exam\'s grade.',
              })
            : showNotification({
                variant: 'success',
                message: `Allocated ${result.allocatedCount} student(s) across ${result.hallsUsed} hall(s) — ${result.specialNeedsPlaced} special-needs seat(s) placed.`,
              }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not auto-allocate seats.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
            <CalendarDays size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Exam Seat Allocation</h4>
            <p className="text-muted small mb-0">Create an exam sitting, then auto-allocate every enrolled student to a seat.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowCreateExam((v) => !v)}>
          <Plus size={16} /> {showCreateExam ? 'Cancel' : 'New Exam'}
        </button>
      </div>

      {showCreateExam && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Exam Name</label>
                <input type="text" className="form-control" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="O/L Sinhala Language 2026" />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Exam Type</label>
                <select className="form-select" value={examType} onChange={(e) => setExamType(e.target.value as ExamType)}>
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{EXAM_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Academic Year</label>
                <input type="text" className="form-control" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Subject</label>
                <select className="form-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select subject…</option>
                  {subjects?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Grade</label>
                <select className="form-select" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">Select grade…</option>
                  {grades?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Date</label>
                <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Start Time</label>
                <input type="time" className="form-control" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">End Time</label>
                <input type="time" className="form-control" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button type="button" className="btn btn-primary w-100" disabled={createExam.isPending} onClick={handleCreateExam}>
                  {createExam.isPending ? 'Creating…' : 'Create Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <>
          {!allocationsLoading && (allocations?.length ?? 0) === 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><Shuffle size={16} /> Auto-Allocate Seats</h6>
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="mixClasses" checked={mixClasses} onChange={(e) => setMixClasses(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="mixClasses">Mix students from different classes (prevents copying)</label>
                </div>

                <label className="form-label small fw-semibold mb-2">Special Needs Students (front row / aisle seating)</label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {specialNeeds.map((s) => (
                    <span key={s.id} className="badge bg-light text-dark border d-flex align-items-center gap-1 px-2 py-2">
                      {s.name}
                      <X size={12} role="button" onClick={() => setSpecialNeeds((prev) => prev.filter((p) => p.id !== s.id))} />
                    </span>
                  ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setPickerOpen((v) => !v)}>
                    + Add Student
                  </button>
                </div>
                {pickerOpen && (
                  <StudentPicker
                    selectedId={null}
                    onSelect={(id, name) => {
                      setSpecialNeeds((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, { id, name }]))
                      setPickerOpen(false)
                    }}
                  />
                )}

                <button type="button" className="btn btn-primary mt-2" disabled={autoAllocate.isPending} onClick={handleAllocate}>
                  {autoAllocate.isPending ? 'Allocating…' : 'Allocate Seats'}
                </button>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <span className="fw-bold text-white d-flex align-items-center gap-2"><Users size={16} /> Seating Roster ({allocations?.length ?? 0})</span>
            </div>
            <div className="card-body p-0">
              {allocationsLoading ? (
                <div className="p-4 text-muted small">Loading…</div>
              ) : !allocations?.length ? (
                <div className="p-5 text-center text-muted">
                  <Users size={36} className="mb-2 opacity-25" />
                  <p className="mb-0">No seats allocated yet.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Student</th>
                        <th>Hall</th>
                        <th>Seat</th>
                        <th>Special Needs</th>
                        <th className="pe-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map((row) => (
                        <tr key={row.allocation.id}>
                          <td className="ps-4 small fw-semibold">{row.studentName}</td>
                          <td className="small">{row.hallName}</td>
                          <td className="small">{row.seatLabel}</td>
                          <td className="small">{row.allocation.specialNeeds ? 'Yes' : '-'}</td>
                          <td className="pe-4">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOverrideTarget(row.allocation.id)}>
                              Override
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {!!allocations?.length && (
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <span className="fw-bold text-white d-flex align-items-center gap-2"><UserCheck size={16} /> Invigilators &amp; Documents</span>
              </div>
              <div className="card-body">
                {Array.from(new Map(allocations.map((row) => [row.allocation.examHallId, row.hallName])).entries()).map(([hallId, hallName]) => (
                  <HallInvigilatorPanel key={hallId} examId={selectedExamId} examHallId={hallId} hallName={hallName} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {overrideTarget && selectedExamId && (
        <OverrideModal examId={selectedExamId} allocationId={overrideTarget} onClose={() => setOverrideTarget(null)} />
      )}
    </div>
  )
}
