'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useDamageReports } from '@/features/session-equipment/hooks/useDamageReports'
import type { DamageReportType } from '@/types/sims/session-equipment'

function DamageReportsContent() {
  const { data: labs = [] } = useLabs()
  const [labId, setLabId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportType, setReportType] = useState<DamageReportType | ''>('')

  const { data: reports = [], isLoading } = useDamageReports({
    labId: labId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    reportType: reportType || undefined,
  })

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}>
            <AlertTriangle size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Equipment Damage & Missing Reports</h4>
            <p className="text-muted small mb-0">Permanent, append-only log of every reported damage or missing item</p>
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
            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">Type</label>
              <select className="form-select form-select-sm" value={reportType} onChange={(e) => setReportType(e.target.value as DamageReportType | '')}>
                <option value="">All</option>
                <option value="damaged">Damaged</option>
                <option value="missing">Missing</option>
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
          ) : reports.length === 0 ? (
            <div className="text-center text-muted py-5 small">No damage or missing reports for this filter.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date Reported</th>
                    <th>Lab</th>
                    <th>Session Date</th>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Responsible Student</th>
                    <th>Reported By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="small">{new Date(r.reportedAt).toLocaleString('en-LK')}</td>
                      <td className="small">{r.labName}</td>
                      <td className="small">{r.sessionDate ?? '—'}</td>
                      <td className="small">{r.equipment.name}</td>
                      <td>
                        <span className={`badge ${r.reportType === 'damaged' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                          {r.reportType}
                        </span>
                      </td>
                      <td className="small">{r.quantity}</td>
                      <td className="small">{r.responsibleStudent ? `${r.responsibleStudent.firstName} ${r.responsibleStudent.lastName}` : '—'}</td>
                      <td className="small">{r.reportedBy.firstName} {r.reportedBy.lastName}</td>
                      <td className="small text-muted">{r.notes ?? '—'}</td>
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

export default function DamageReportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER]}>
      <DamageReportsContent />
    </RoleGuard>
  )
}
