'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { History, ArrowLeft, CheckCircle, XCircle, Users, MessageSquare, Mail, Bell, X } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useTargetedMessageHistory } from '@/features/communication/hooks/useTargetedMessageHistory'
import { useTargetedMessageDetail } from '@/features/communication/hooks/useTargetedMessageDetail'

function formatDateTime(d: string) {
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  sent: { bg: '#dcfce7', text: '#15803d' },
  failed: { bg: '#fee2e2', text: '#dc2626' },
  pending: { bg: '#f3f4f6', text: '#6b7280' },
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  sms: <MessageSquare size={12} />,
  email: <Mail size={12} />,
  push: <Bell size={12} />,
}

function MessageDetailPanel({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const { data, isLoading } = useTargetedMessageDetail(messageId)

  return (
    <div className="card border-0 shadow-sm rounded-4 mt-3">
      <div className="card-header border-0 py-3 px-4 rounded-top-4 bg-white d-flex align-items-center justify-content-between">
        <span className="fw-bold small">{data?.message.subject ?? 'Loading…'}</span>
        <button type="button" className="btn btn-link btn-sm p-0 text-muted" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="card-body p-0">
        {isLoading && <div className="p-4 text-center text-muted small">Loading…</div>}
        {!isLoading && data && (
          <>
            <div className="px-4 pt-3 pb-2 small text-muted">{data.message.body}</div>
            <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <tr>
                    <th className="px-4 py-2 text-muted small fw-semibold border-0">Recipient</th>
                    <th className="py-2 text-muted small fw-semibold border-0">Type</th>
                    <th className="py-2 text-muted small fw-semibold border-0">Channel</th>
                    <th className="py-2 px-4 text-muted small fw-semibold border-0">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recipients.map((r) => {
                    const style = STATUS_STYLE[r.deliveryStatus]
                    return (
                      <tr key={r.id}>
                        <td className="px-4 small fw-semibold">{r.recipientName}</td>
                        <td>
                          <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: '0.68rem' }}>
                            {r.recipientType === 'parent' ? 'Parent' : 'Teacher'}
                          </span>
                        </td>
                        <td>
                          <span className="d-inline-flex align-items-center gap-1 small text-muted">
                            {CHANNEL_ICONS[r.channel]} {r.channel.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4">
                          <span
                            className="badge rounded-pill"
                            style={{ background: style.bg, color: style.text, fontSize: '0.7rem' }}
                            title={r.failureReason ?? ''}
                          >
                            {r.deliveryStatus}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TargetedMessageHistoryContent() {
  const { data: messages, isLoading } = useTargetedMessageHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#0d6efd,#0a58ca)' }}
          >
            <History size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Message History</h4>
            <p className="mb-0 text-muted small">Every targeted message you&apos;ve sent, most recent first</p>
          </div>
        </div>
        <Link href="/principal/targeted-message" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
          <ArrowLeft size={14} /> Compose New
        </Link>
      </div>

      {isLoading && (
        <div className="placeholder-glow">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 64 }} />
          ))}
        </div>
      )}

      {!isLoading && (messages?.length ?? 0) === 0 && (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">No targeted messages sent yet.</div>
        </div>
      )}

      <div className="d-flex flex-column gap-2">
        {(messages ?? []).map((m) => {
          const successRate = m.recipientCount > 0 ? Math.round((m.sentCount / (m.sentCount + m.failedCount || 1)) * 100) : 0
          return (
            <div key={m.id} className="card border-0 shadow-sm rounded-4">
              <button
                type="button"
                className="card-body d-flex align-items-center justify-content-between gap-3 flex-wrap text-start border-0 bg-transparent w-100"
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              >
                <div>
                  <div className="fw-semibold small">{m.subject}</div>
                  <div className="text-muted small">{formatDateTime(m.sentAt)} · Sent by {m.sentByStaff.firstName} {m.sentByStaff.lastName}</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="d-inline-flex align-items-center gap-1 small text-muted">
                    <Users size={14} /> {m.recipientCount}
                  </span>
                  <span className="d-inline-flex align-items-center gap-1 small" style={{ color: '#15803d' }}>
                    <CheckCircle size={14} /> {m.sentCount}
                  </span>
                  {m.failedCount > 0 && (
                    <span className="d-inline-flex align-items-center gap-1 small" style={{ color: '#dc2626' }}>
                      <XCircle size={14} /> {m.failedCount}
                    </span>
                  )}
                  <span className="badge bg-light text-muted border">{successRate}% delivered</span>
                </div>
              </button>
              {expandedId === m.id && (
                <div className="px-3 pb-3">
                  <MessageDetailPanel messageId={m.id} onClose={() => setExpandedId(null)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function TargetedMessageHistoryPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <TargetedMessageHistoryContent />
    </RoleGuard>
  )
}
