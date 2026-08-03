'use client'
import { useState } from 'react'
import { UserCheck, ShieldAlert, LogOut, Search, FileDown, Ban, ShieldOff, Users, BarChart3, UserX } from 'lucide-react'
import { useSignInVisitor } from '../hooks/useSignInVisitor'
import { useSignOutVisitor } from '../hooks/useSignOutVisitor'
import { useActiveVisitors } from '../hooks/useActiveVisitors'
import { useVisitorSearch } from '../hooks/useVisitorSearch'
import { useSetBlocked } from '../hooks/useSetBlocked'
import { useBlockNewVisitor } from '../hooks/useBlockNewVisitor'
import { useDownloadBadgePdf } from '../hooks/useDownloadBadgePdf'
import { useTodaysPreRegistrations } from '../hooks/usePreRegistrationLookup'
import { useDailyVisitorReport } from '../hooks/useDailyVisitorReport'
import { useStaff } from '@/features/staff/hooks/useStaff'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import {
  VISITOR_ID_TYPE_LABELS,
  VISITOR_TYPE_LABELS,
  type SearchVisitorsFilter,
  type VisitorIdType,
  type VisitorType,
} from '@/types/sims/visitors'
import { useNotificationContext } from '@/context/useNotificationContext'

const ID_TYPES = Object.keys(VISITOR_ID_TYPE_LABELS) as VisitorIdType[]
const VISITOR_TYPES = Object.keys(VISITOR_TYPE_LABELS) as VisitorType[]

function defaultExpectedDeparture(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export function VisitorManagementContent() {
  const { user } = useAuthStore()
  const canManageBlockList = user?.role === ROLES.SYSTEM_ADMIN || user?.role === ROLES.PRINCIPAL
  const { showNotification } = useNotificationContext()

  const signIn = useSignInVisitor()
  const signOut = useSignOutVisitor()
  const { data: active, isLoading: activeLoading } = useActiveVisitors()
  const setBlocked = useSetBlocked()
  const blockNew = useBlockNewVisitor()
  const badgePdf = useDownloadBadgePdf()
  const { data: todaysPreRegs } = useTodaysPreRegistrations()
  const todayIso = new Date().toISOString().split('T')[0]
  const { data: dailySummary } = useDailyVisitorReport(todayIso)

  const [fullName, setFullName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idType, setIdType] = useState<VisitorIdType>('nic')
  const [visitorType, setVisitorType] = useState<VisitorType>('parent')
  const [purpose, setPurpose] = useState('')
  const [hostSearch, setHostSearch] = useState('')
  const [hostStaffId, setHostStaffId] = useState('')
  const [hostName, setHostName] = useState('')
  const [expectedDepartureTime, setExpectedDepartureTime] = useState(defaultExpectedDeparture())
  const [preRegistrationId, setPreRegistrationId] = useState<string | undefined>(undefined)

  const { data: hostResults } = useStaff({ search: hostSearch, limit: 8 })

  const [historyName, setHistoryName] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [historyPurpose, setHistoryPurpose] = useState('')
  const [historyHostSearch, setHistoryHostSearch] = useState('')
  const [historyHostStaffId, setHistoryHostStaffId] = useState('')
  const [historyHostName, setHistoryHostName] = useState('')
  const [historyFilters, setHistoryFilters] = useState<SearchVisitorsFilter | null>(null)
  const { data: historyHostResults } = useStaff({ search: historyHostSearch, limit: 8 })
  const { data: historyResults, isLoading: historyLoading } = useVisitorSearch(
    historyFilters ?? {},
    !!historyFilters,
  )

  const [blockName, setBlockName] = useState('')
  const [blockIdNumber, setBlockIdNumber] = useState('')
  const [blockIdType, setBlockIdType] = useState<VisitorIdType>('nic')
  const [blockReason, setBlockReason] = useState('')

  const applyPreRegistration = (id: string) => {
    const rec = todaysPreRegs?.find((p) => p.id === id)
    if (!rec) return
    setFullName(rec.fullName)
    setIdNumber(rec.idNumber ?? '')
    if (rec.idType) setIdType(rec.idType)
    setVisitorType(rec.visitorType)
    setPurpose(rec.purpose)
    setHostStaffId(rec.hostStaffId)
    setPreRegistrationId(rec.id)
  }

  const resetForm = () => {
    setFullName('')
    setIdNumber('')
    setPurpose('')
    setHostSearch('')
    setHostStaffId('')
    setHostName('')
    setExpectedDepartureTime(defaultExpectedDeparture())
    setPreRegistrationId(undefined)
  }

  const handleSignIn = () => {
    if (!fullName.trim() || !idNumber.trim() || !purpose.trim() || !hostStaffId) {
      showNotification({ variant: 'danger', message: 'Name, ID number, purpose, and host are all required.' })
      return
    }
    signIn.mutate(
      {
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        idType,
        visitorType,
        purpose: purpose.trim(),
        hostStaffId,
        expectedDepartureTime: new Date(expectedDepartureTime).toISOString(),
        preRegistrationId,
      },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `${fullName} signed in — host notified, badge issued.` })
          resetForm()
        },
        onError: (err: any) =>
          showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not sign in this visitor.' }),
      },
    )
  }

  const handleSignOut = (logId: string, name: string) => {
    signOut.mutate(logId, {
      onSuccess: (result) =>
        showNotification({ variant: 'success', message: `${name} signed out — visit duration ${result.durationMinutes} min.` }),
      onError: (err: any) =>
        showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not sign out this visitor.' }),
    })
  }

  const handleBlock = (visitorId: string, name: string, block: boolean) => {
    const reason = block ? window.prompt(`Reason for blocking ${name}?`) ?? undefined : undefined
    if (block && !reason) return
    setBlocked.mutate(
      { visitorId, payload: { isBlocked: block, reason } },
      {
        onSuccess: () =>
          showNotification({ variant: 'success', message: `${name} ${block ? 'added to' : 'removed from'} the blocked list.` }),
        onError: (err: any) =>
          showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not update the block list.' }),
      },
    )
  }

  const handleHistorySearch = () => {
    const filters: SearchVisitorsFilter = {}
    if (historyName.trim()) filters.name = historyName.trim()
    if (historyFrom) filters.from = new Date(historyFrom).toISOString()
    if (historyTo) filters.to = new Date(historyTo).toISOString()
    if (historyPurpose.trim()) filters.purpose = historyPurpose.trim()
    if (historyHostStaffId) filters.hostStaffId = historyHostStaffId

    if (Object.keys(filters).length === 0) {
      showNotification({ variant: 'danger', message: 'Enter at least one search filter (name, date range, purpose, or host).' })
      return
    }
    setHistoryFilters(filters)
  }

  const handleBlockNew = () => {
    if (!blockName.trim() || !blockIdNumber.trim()) {
      showNotification({ variant: 'danger', message: 'Name and ID number are required.' })
      return
    }
    blockNew.mutate(
      { fullName: blockName.trim(), idNumber: blockIdNumber.trim(), idType: blockIdType, reason: blockReason.trim() || undefined },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `${blockName} added to the blocked list.` })
          setBlockName('')
          setBlockIdNumber('')
          setBlockReason('')
        },
        onError: (err: any) =>
          showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not add to the blocked list.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0" style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
          <ShieldAlert size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Visitor Management</h4>
          <p className="text-muted small mb-0">Sign in every visitor, notify their host, and track sign-out.</p>
        </div>
      </div>

      {dailySummary && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><BarChart3 size={16} /> Today&apos;s Visitor Summary</h6>
            <div className="row g-3 text-center mb-3">
              <div className="col-6 col-md-2">
                <div className="fs-4 fw-bold">{dailySummary.totalVisitors}</div>
                <div className="text-muted small">Total</div>
              </div>
              <div className="col-6 col-md-2">
                <div className="fs-4 fw-bold">{dailySummary.stillOnSite}</div>
                <div className="text-muted small">On Site</div>
              </div>
              <div className="col-6 col-md-2">
                <div className="fs-4 fw-bold">{dailySummary.signedOut}</div>
                <div className="text-muted small">Signed Out</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="fs-4 fw-bold">{dailySummary.averageDurationMinutes}m</div>
                <div className="text-muted small">Avg. Duration</div>
              </div>
              <div className="col-6 col-md-3">
                <div className={`fs-4 fw-bold ${dailySummary.overstayCount > 0 ? 'text-danger' : ''}`}>{dailySummary.overstayCount}</div>
                <div className="text-muted small">Overstays</div>
              </div>
            </div>
            {Object.keys(dailySummary.byType).length > 0 && (
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(dailySummary.byType).map(([type, count]) => (
                  <span key={type} className="badge bg-light text-dark border px-2 py-2">
                    {VISITOR_TYPE_LABELS[type as VisitorType] ?? type}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><UserCheck size={16} /> Sign In a Visitor</h6>

          {!!todaysPreRegs?.length && (
            <div className="mb-3">
              <label className="form-label small fw-semibold">Expected Today (pre-registered)</label>
              <select className="form-select form-select-sm" value={preRegistrationId ?? ''} onChange={(e) => e.target.value && applyPreRegistration(e.target.value)}>
                <option value="">Select to pre-fill…</option>
                {todaysPreRegs.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName} — {p.purpose}</option>
                ))}
              </select>
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Full Name</label>
              <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="W. A. Sunil Perera" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">ID Number</label>
              <input type="text" className="form-control" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="881234567V" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">ID Type</label>
              <select className="form-select" value={idType} onChange={(e) => setIdType(e.target.value as VisitorIdType)}>
                {ID_TYPES.map((t) => <option key={t} value={t}>{VISITOR_ID_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Visitor Type</label>
              <select className="form-select" value={visitorType} onChange={(e) => setVisitorType(e.target.value as VisitorType)}>
                {VISITOR_TYPES.map((t) => <option key={t} value={t}>{VISITOR_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Purpose of Visit</label>
              <input type="text" className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Repairing the science lab AC" />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Expected Departure</label>
              <input type="datetime-local" className="form-control" value={expectedDepartureTime} onChange={(e) => setExpectedDepartureTime(e.target.value)} />
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold">Host (staff member they're meeting)</label>
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

          <button type="button" className="btn btn-danger mt-3" disabled={signIn.isPending} onClick={handleSignIn}>
            {signIn.isPending ? 'Signing In…' : 'Sign In & Issue Badge'}
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-3" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
          <span className="fw-bold text-white d-flex align-items-center gap-2"><Users size={16} /> Currently On Site ({active?.length ?? 0})</span>
        </div>
        <div className="card-body p-0">
          {activeLoading ? (
            <div className="p-4 text-muted small">Loading…</div>
          ) : !active?.length ? (
            <div className="p-5 text-center text-muted">
              <Users size={36} className="mb-2 opacity-25" />
              <p className="mb-0">No visitors currently signed in.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Purpose</th>
                    <th>Signed In</th>
                    <th>Expected Departure</th>
                    <th className="pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((log) => (
                    <tr key={log.id}>
                      <td className="ps-4 small">{log.purpose}</td>
                      <td className="small">{new Date(log.signedInAt).toLocaleTimeString()}</td>
                      <td className="small">{new Date(log.expectedDepartureTime).toLocaleTimeString()}</td>
                      <td className="pe-4 d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" disabled={badgePdf.isDownloading} onClick={() => badgePdf.download(log.id, log.purpose)}>
                          <FileDown size={14} /> Badge
                        </button>
                        <button type="button" className="btn btn-sm btn-danger d-flex align-items-center gap-1" disabled={signOut.isPending} onClick={() => handleSignOut(log.id, log.purpose)}>
                          <LogOut size={14} /> Sign Out
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

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><Search size={16} /> Visitor History Search</h6>
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Visitor Name</label>
              <input type="text" className="form-control" placeholder="Search by name…" value={historyName} onChange={(e) => setHistoryName(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Purpose</label>
              <input type="text" className="form-control" placeholder="Search by purpose…" value={historyPurpose} onChange={(e) => setHistoryPurpose(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">From</label>
              <input type="date" className="form-control" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">To</label>
              <input type="date" className="form-control" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Host</label>
              {historyHostStaffId ? (
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-light text-dark border px-2 py-2">{historyHostName}</span>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setHistoryHostStaffId(''); setHistoryHostName(''); }}>Clear</button>
                </div>
              ) : (
                <>
                  <input type="text" className="form-control" placeholder="Search staff by name…" value={historyHostSearch} onChange={(e) => setHistoryHostSearch(e.target.value)} />
                  {historyHostSearch.trim() && (
                    <div className="list-group mt-1">
                      {(historyHostResults?.data ?? []).map((s) => (
                        <button key={s.id} type="button" className="list-group-item list-group-item-action small" onClick={() => { setHistoryHostStaffId(s.id); setHistoryHostName(`${s.firstName} ${s.lastName}`); setHistoryHostSearch(''); }}>
                          {s.firstName} {s.lastName} — {s.designation}
                        </button>
                      ))}
                      {!(historyHostResults?.data ?? []).length && <div className="list-group-item small text-muted">No matches.</div>}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <button type="button" className="btn btn-outline-secondary" onClick={handleHistorySearch}>Search</button>
            </div>
          </div>
          {historyLoading && <div className="text-muted small">Searching…</div>}
          {!!historyResults?.length && (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Purpose</th>
                    <th>Signed In</th>
                    <th>Signed Out</th>
                    {canManageBlockList && <th>Block</th>}
                  </tr>
                </thead>
                <tbody>
                  {historyResults.map((log) => (
                    <tr key={log.id}>
                      <td className="small">{log.purpose}</td>
                      <td className="small">{new Date(log.signedInAt).toLocaleString()}</td>
                      <td className="small">{log.signedOutAt ? new Date(log.signedOutAt).toLocaleString() : <span className="text-muted">Still on site</span>}</td>
                      {canManageBlockList && (
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={() => handleBlock(log.visitorId, log.purpose, true)}>
                            <Ban size={12} /> Block Visitor
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {historyFilters && !historyLoading && !historyResults?.length && (
            <div className="text-muted small">No visitors found.</div>
          )}
        </div>
      </div>

      {canManageBlockList && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2"><UserX size={16} /> Add to Blocked List</h6>
            <p className="text-muted small mb-3">
              Block someone who has never actually visited — e.g. a known troublemaker reported by another school. If they later attempt to sign in under this ID, it will be denied and Security/Principal alerted immediately.
            </p>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Full Name</label>
                <input type="text" className="form-control" value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">ID Number</label>
                <input type="text" className="form-control" value={blockIdNumber} onChange={(e) => setBlockIdNumber(e.target.value)} placeholder="881234567V" />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold">ID Type</label>
                <select className="form-select" value={blockIdType} onChange={(e) => setBlockIdType(e.target.value as VisitorIdType)}>
                  {ID_TYPES.map((t) => <option key={t} value={t}>{VISITOR_ID_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Reason</label>
                <input type="text" className="form-control" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reported by another school for repeated unauthorized entry." />
              </div>
            </div>
            <button type="button" className="btn btn-outline-danger mt-3 d-flex align-items-center gap-2" disabled={blockNew.isPending} onClick={handleBlockNew}>
              <Ban size={14} /> {blockNew.isPending ? 'Adding…' : 'Add to Blocked List'}
            </button>
          </div>
        </div>
      )}

      {canManageBlockList && (
        <div className="rounded-3 p-3 d-flex align-items-start gap-2" style={{ background: '#fff1f2', color: '#9f1239' }}>
          <ShieldOff size={16} className="mt-1 flex-shrink-0" />
          <div className="small">
            Blocking a visitor here (either above, or via the &quot;Block Visitor&quot; action in history search results) applies to every future visit under the same ID number — a blocked sign-in attempt is denied and Security/Principal are alerted immediately.
          </div>
        </div>
      )}
    </div>
  )
}
