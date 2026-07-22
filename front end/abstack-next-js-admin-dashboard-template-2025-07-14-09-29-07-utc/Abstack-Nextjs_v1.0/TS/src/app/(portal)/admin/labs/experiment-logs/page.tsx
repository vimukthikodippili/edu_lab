'use client'
import { useState } from 'react'
import Link from 'next/link'
import { FlaskConical, ArrowLeft, Paperclip } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useExperimentLogHistory } from '@/features/experiment-log/hooks/useExperimentLogHistory'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function ExperimentLogHistoryContent() {
  const { data: labs = [] } = useLabs()
  const { data: subjectsPage } = useSubjects({ limit: 100 })
  const subjects = subjectsPage?.data ?? []

  const [labId, setLabId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: logs = [], isLoading } = useExperimentLogHistory({
    labId: labId || undefined,
    subjectId: subjectId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
            <FlaskConical size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Experiment Log History</h4>
            <p className="text-muted small mb-0">Searchable record of every lab experiment conducted, per subject, class, and year</p>
          </div>
        </div>
        <Link href="/admin/labs/directory" className="btn btn-outline-secondary btn-sm">
          <ArrowLeft size={14} className="me-1" /> Back to Directory
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Lab</label>
              <select className="form-select form-select-sm" value={labId} onChange={(e) => setLabId(e.target.value)}>
                <option value="">All labs</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Subject</label>
              <select className="form-select form-select-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">From</label>
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">To</label>
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-3 placeholder-glow">
              {[1, 2, 3].map((i) => <span key={i} className="placeholder col-12 rounded d-block mb-2" style={{ height: 40 }} />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted py-5 small">No experiment logs for this filter.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Session Date</th>
                    <th>Lab</th>
                    <th>Experiment</th>
                    <th>Objective</th>
                    <th>Outcome</th>
                    <th>Logged By</th>
                    <th>Attachments</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="small">{log.labBooking?.date ?? '—'}</td>
                      <td className="small">{log.labName}</td>
                      <td className="small fw-semibold">{log.experimentName}</td>
                      <td className="small text-muted" style={{ maxWidth: 220 }}>{log.objective}</td>
                      <td className="small text-muted" style={{ maxWidth: 220 }}>{log.outcome}</td>
                      <td className="small">{log.loggedBy.firstName} {log.loggedBy.lastName}</td>
                      <td className="small">
                        {log.attachments.length > 0 ? (
                          <span className="d-flex flex-column gap-1">
                            {log.attachments.map((a) => (
                              <a key={a.id} href={`${API_URL}${a.path}`} target="_blank" rel="noreferrer">
                                <Paperclip size={11} className="me-1" />{a.path.split('/').pop()}
                              </a>
                            ))}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ExperimentLogHistoryPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <ExperimentLogHistoryContent />
    </RoleGuard>
  )
}
