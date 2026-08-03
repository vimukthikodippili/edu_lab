'use client'
import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { usePreRegisterVisitor } from '../hooks/usePreRegisterVisitor'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { VISITOR_TYPE_LABELS, type VisitorType } from '@/types/sims/visitors'
import { useNotificationContext } from '@/context/useNotificationContext'

const VISITOR_TYPES = Object.keys(VISITOR_TYPE_LABELS) as VisitorType[]

export function PreRegisterVisitorContent() {
  const { showNotification } = useNotificationContext()
  const preRegister = usePreRegisterVisitor()

  const [fullName, setFullName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [visitorType, setVisitorType] = useState<VisitorType>('parent')
  const [purpose, setPurpose] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [hostSearch, setHostSearch] = useState('')
  const [hostStaffId, setHostStaffId] = useState('')
  const [hostName, setHostName] = useState('')

  const { data: hostResults } = useStaff({ search: hostSearch, limit: 8 })

  const handleSubmit = () => {
    if (!fullName.trim() || !purpose.trim() || !expectedDate || !hostStaffId) {
      showNotification({ variant: 'danger', message: 'Name, purpose, expected date, and host are all required.' })
      return
    }
    preRegister.mutate(
      {
        fullName: fullName.trim(),
        idNumber: idNumber.trim() || undefined,
        visitorType,
        purpose: purpose.trim(),
        expectedDate,
        hostStaffId,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `${fullName} pre-registered — reception will see this on arrival.` })
          setFullName('')
          setIdNumber('')
          setPurpose('')
          setExpectedDate('')
          setHostStaffId('')
          setHostName('')
        },
        onError: (err: any) =>
          showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not pre-register this visitor.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <CalendarPlus size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Pre-Register a Visitor</h4>
          <p className="text-muted small mb-0">Expecting someone? Pre-register them so reception can sign them in faster on arrival.</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm" style={{ maxWidth: 640 }}>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Visitor Full Name</label>
              <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Anoma Wickramasinghe" />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">ID Number (optional)</label>
              <input type="text" className="form-control" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="881234567V" />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Visitor Type</label>
              <select className="form-select" value={visitorType} onChange={(e) => setVisitorType(e.target.value as VisitorType)}>
                {VISITOR_TYPES.map((t) => <option key={t} value={t}>{VISITOR_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Expected Date</label>
              <input type="date" className="form-control" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Purpose of Visit</label>
              <input type="text" className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Meeting about Grade 9 science fair project" />
            </div>
            <div className="col-12">
              <label className="form-label small fw-semibold">Host (you, or another staff member)</label>
              {hostStaffId ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark border px-2 py-2">{hostName}</span>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setHostStaffId(''); setHostName(''); }}>Change</button>
                </div>
              ) : (
                <>
                  <input type="text" className="form-control" placeholder="Search staff by name…" value={hostSearch} onChange={(e) => setHostSearch(e.target.value)} />
                  {hostSearch.trim() && (
                    <div className="list-group mt-1">
                      {(hostResults?.data ?? []).map((s) => (
                        <button key={s.id} type="button" className="list-group-item list-group-item-action small" onClick={() => { setHostStaffId(s.id); setHostName(`${s.firstName} ${s.lastName}`); setHostSearch(''); }}>
                          {s.firstName} {s.lastName} — {s.designation}
                        </button>
                      ))}
                      {!(hostResults?.data ?? []).length && <div className="list-group-item small text-muted">No matches.</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button type="button" className="btn btn-primary mt-3" disabled={preRegister.isPending} onClick={handleSubmit}>
            {preRegister.isPending ? 'Saving…' : 'Pre-Register Visitor'}
          </button>
        </div>
      </div>
    </div>
  )
}
