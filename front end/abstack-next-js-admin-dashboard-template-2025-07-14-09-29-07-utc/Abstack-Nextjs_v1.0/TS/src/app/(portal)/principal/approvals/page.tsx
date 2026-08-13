'use client'
import React, { useState } from 'react'
import {
  CheckCircle,
  ClipboardList,
  Filter,
  XCircle,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useApprovalQueue } from '@/features/principal/hooks/useApprovalQueue'
import { useApprovalHistory } from '@/features/principal/hooks/useApprovalHistory'
import { useDecideApproval } from '@/features/principal/hooks/useDecideApproval'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { ApprovalHistoryItem, ApprovalItemType, ApprovalQueueItem } from '@/types/sims/approval'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | ApprovalItemType

const TYPE_CFG: Record<
  ApprovalItemType,
  { label: string; bg: string; color: string }
> = {
  fee_waiver:      { label: 'Fee Waiver',      bg: '#ede9fe', color: '#6d28d9' },
  leave:           { label: 'Leave',           bg: '#dbeafe', color: '#1d4ed8' },
  expense:         { label: 'Expense',         bg: '#fef3c7', color: '#b45309' },
  mark_correction: { label: 'Mark Correction', bg: '#dcfce7', color: '#15803d' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ApprovalItemType }) {
  const cfg = TYPE_CFG[type]
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem' }}
    >
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === 'approved'
      ? { bg: '#dcfce7', color: '#15803d' }
      : status === 'rejected'
      ? { bg: '#fee2e2', color: '#dc2626' }
      : { bg: '#fef9c3', color: '#92400e' }
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem' }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function HistoryTable() {
  const { data: history = [], isLoading, isError } = useApprovalHistory()

  return (
    <div className="card border-0 shadow-sm rounded-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
        style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <ClipboardList size={16} />
          Decision History
        </span>
        {!isLoading && (
          <span
            className="badge rounded-pill text-white"
            style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}
          >
            {history.length}
          </span>
        )}
      </div>

      <div className="card-body p-0">
        {isLoading && (
          <div className="p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="placeholder-glow mb-2">
                <span className="placeholder col-12 rounded" style={{ height: 56 }} />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-4">
            <div className="alert alert-danger py-2 small mb-0">
              Failed to load approval history. Please refresh.
            </div>
          </div>
        )}

        {!isLoading && !isError && history.length === 0 && (
          <div className="text-center text-muted py-5">
            <ClipboardList size={36} className="mb-3 opacity-25" />
            <p className="mb-1 fw-semibold">No decisions yet</p>
            <p className="mb-0 small">Approved and rejected items will show up here.</p>
          </div>
        )}

        {!isLoading && !isError && history.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="px-4 py-3 text-muted small fw-semibold border-0">Requester</th>
                  <th className="py-3 text-muted small fw-semibold border-0">Type</th>
                  <th className="py-3 text-muted small fw-semibold border-0">Decision</th>
                  <th className="py-3 text-muted small fw-semibold border-0">Decided By</th>
                  <th className="py-3 text-muted small fw-semibold border-0">Decided At</th>
                  <th className="py-3 text-muted small fw-semibold border-0 px-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item: ApprovalHistoryItem) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td className="px-4">
                      <div className="fw-semibold small">{item.requesterName}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {item.requesterDetail}
                      </div>
                    </td>
                    <td>
                      <TypeBadge type={item.type} />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="small">{item.decidedByName}</td>
                    <td className="small text-muted text-nowrap">
                      {new Date(item.decidedAt).toLocaleString()}
                    </td>
                    <td className="small text-muted px-4">{item.decisionNote || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ApprovalsContent() {
  const { showNotification } = useNotificationContext()
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})

  const { data: queue = [], isLoading, isError } = useApprovalQueue()
  const decide = useDecideApproval()

  const setNote = (id: string, val: string) =>
    setNoteMap((prev) => ({ ...prev, [id]: val }))

  const filtered: ApprovalQueueItem[] =
    activeTab === 'all' ? queue : queue.filter((i) => i.type === activeTab)

  const pendingCount = queue.filter((i) => i.status === 'pending').length

  const handleDecide = (
    item: ApprovalQueueItem,
    decision: 'approve' | 'reject',
  ) => {
    const verb = decision === 'approve' ? 'Approve' : 'Reject'
    const label = TYPE_CFG[item.type].label
    if (
      !window.confirm(
        `${verb} this ${label} request from ${item.requesterName}?`,
      )
    )
      return

    decide.mutate(
      { id: item.id, type: item.type, decision, decisionNote: noteMap[item.id] || undefined },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: `${label} request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`,
          })
          setNoteMap((prev) => {
            const next = { ...prev }
            delete next[item.id]
            return next
          })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? `Failed to ${decision} request.`
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',             label: `All (${pendingCount} pending)` },
    { key: 'leave',           label: 'Leave'      },
    { key: 'fee_waiver',      label: 'Fee Waivers' },
    { key: 'expense',         label: 'Expenses'   },
    { key: 'mark_correction', label: 'Mark Corrections' },
  ]

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={ClipboardList}
        title="Approval Queue"
        subtitle="Unified view of all pending leave requests, fee waivers, and expense approvals"
      />

      {/* Pending / History toggle */}
      <div className="mb-3 d-flex gap-2">
        {(['pending', 'history'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`btn btn-sm fw-semibold px-3 ${
              viewMode === mode ? 'text-white' : 'btn-outline-secondary'
            }`}
            style={
              viewMode === mode
                ? { background: 'var(--edulab-nav-bg)', border: 'none' }
                : undefined
            }
            onClick={() => setViewMode(mode)}
          >
            {mode === 'pending' ? 'Pending' : 'History'}
          </button>
        ))}
      </div>

      {viewMode === 'history' ? (
        <HistoryTable />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="mb-4 d-flex gap-2 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`btn btn-sm fw-semibold px-3 ${
                  activeTab === tab.key ? 'text-white' : 'btn-outline-secondary'
                }`}
                style={
                  activeTab === tab.key
                    ? { background: 'var(--edulab-accent)', border: 'none' }
                    : undefined
                }
                onClick={() => setActiveTab(tab.key)}
              >
                <Filter size={12} className="me-1" />
                {tab.label}
              </button>
            ))}
          </div>

      {/* Table card */}
      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
          style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <ClipboardList size={16} />
            {activeTab === 'all'
              ? 'All Pending Approvals'
              : TYPE_CFG[activeTab as ApprovalItemType].label + ' Requests'}
          </span>
          {!isLoading && (
            <span
              className="badge rounded-pill text-white"
              style={{
                background: 'rgba(255,255,255,0.25)',
                fontSize: '0.78rem',
              }}
            >
              {filtered.length}
            </span>
          )}
        </div>

        <div className="card-body p-0">
          {isLoading && (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span
                    className="placeholder col-12 rounded"
                    style={{ height: 56 }}
                  />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="p-4">
              <div className="alert alert-danger py-2 small mb-0">
                Failed to load approval queue. Please refresh.
              </div>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="text-center text-muted py-5">
              <CheckCircle size={36} className="mb-3 text-success opacity-50" />
              <p className="mb-1 fw-semibold">All clear!</p>
              <p className="mb-0 small">No pending items in this category.</p>
            </div>
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">
                      Requester
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0">
                      Type
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0">
                      Details
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0">
                      Reason / Summary
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0">
                      Submitted
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0">
                      Status
                    </th>
                    <th className="py-3 text-muted small fw-semibold border-0 px-4">
                      Decision
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td className="px-4">
                        <div className="fw-semibold small">{item.requesterName}</div>
                      </td>
                      <td>
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="small text-muted">
                        {item.requesterDetail}
                        <br />
                        <span style={{ fontSize: '0.75rem' }}>{item.summary}</span>
                      </td>
                      <td
                        className="small"
                        style={{ maxWidth: 220 }}
                      >
                        <span className="text-wrap">{item.reason}</span>
                      </td>
                      <td className="small text-muted text-nowrap">
                        {new Date(item.submittedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4">
                        {item.status === 'pending' ? (
                          <div
                            className="d-flex flex-column gap-2"
                            style={{ minWidth: 220 }}
                          >
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional decision note…"
                              maxLength={500}
                              value={noteMap[item.id] ?? ''}
                              onChange={(e) => setNote(item.id, e.target.value)}
                            />
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm d-flex align-items-center gap-1 fw-semibold text-white flex-grow-1 justify-content-center"
                                style={{
                                  background: '#15803d',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                }}
                                disabled={decide.isPending}
                                onClick={() => handleDecide(item, 'approve')}
                              >
                                <CheckCircle size={12} />
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm d-flex align-items-center gap-1 fw-semibold flex-grow-1 justify-content-center"
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                }}
                                disabled={decide.isPending}
                                onClick={() => handleDecide(item, 'reject')}
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  )
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function PrincipalApprovalsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL, ROLES.SYSTEM_ADMIN]}>
      <ApprovalsContent />
    </RoleGuard>
  )
}
