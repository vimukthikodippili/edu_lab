'use client'
import React, { useState } from 'react'
import { AlertTriangle, Send, CheckCircle, XCircle, Users, Bell, Mail, MessageSquare } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useSendEmergencyAlert } from '@/features/communication/hooks/useSendEmergencyAlert'
import type { EmergencyAlertSummary, AlertChannelResult } from '@/types/sims/communication'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

const MAX_CHARS = 1000

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  sms: <MessageSquare size={12} />,
  push: <Bell size={12} />,
  email: <Mail size={12} />,
}

function ChannelBadge({ status, channel }: { status: 'sent' | 'failed'; channel: string }) {
  const color = status === 'sent' ? { bg: '#dcfce7', text: '#15803d' } : { bg: '#fee2e2', text: '#dc2626' }
  return (
    <span
      className="badge rounded-pill d-inline-flex align-items-center gap-1"
      style={{ background: color.bg, color: color.text, fontSize: '0.68rem' }}
    >
      {CHANNEL_ICONS[channel]}
      {channel.toUpperCase()} {status === 'sent' ? '✓' : '✗'}
    </span>
  )
}

interface RecipientRow {
  recipientId: string
  recipientName: string
  recipientType: 'guardian' | 'staff'
  channels: AlertChannelResult[]
  hasFailure: boolean
}

function buildRows(results: AlertChannelResult[]): RecipientRow[] {
  const map = new Map<string, RecipientRow>()
  for (const r of results) {
    if (!map.has(r.recipientId)) {
      map.set(r.recipientId, {
        recipientId: r.recipientId,
        recipientName: r.recipientName,
        recipientType: r.recipientType,
        channels: [],
        hasFailure: false,
      })
    }
    const row = map.get(r.recipientId)!
    row.channels.push(r)
    if (r.status === 'failed') row.hasFailure = true
  }
  // Failures float to the top
  return [...map.values()].sort((a, b) => Number(b.hasFailure) - Number(a.hasFailure))
}

function DeliveryReport({ summary }: { summary: EmergencyAlertSummary }) {
  const rows = buildRows(summary.results)
  const sentPct = summary.totalChannels > 0
    ? Math.round((summary.sentCount / summary.totalChannels) * 100)
    : 0

  const stats = [
    { label: 'Recipients', value: summary.totalRecipients, icon: Users, color: '#667eea' },
    { label: 'Channels Tried', value: summary.totalChannels, icon: Bell, color: '#8b5cf6' },
    { label: 'Delivered', value: `${summary.sentCount} (${sentPct}%)`, icon: CheckCircle, color: '#10b981' },
    { label: 'Failed', value: summary.failedCount, icon: XCircle, color: '#ef4444' },
  ]

  return (
    <div className="mt-4">
      <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
        <CheckCircle size={16} color="#10b981" /> Delivery Report
        <span className="text-muted fw-normal small">— sent {new Date(summary.sentAt).toLocaleTimeString()}</span>
      </h6>

      {/* Summary stat cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40, background: `${s.color}20` }}
                >
                  <s.icon size={18} color={s.color} />
                </div>
                <div>
                  <div className="fw-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-muted small">{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-recipient delivery table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-2 px-4 rounded-top-4 d-flex align-items-center justify-content-between"
          style={{ background: '#f8fafc' }}
        >
          <span className="fw-semibold small text-muted">Per-Recipient Delivery Status</span>
          {summary.failedCount > 0 && (
            <span className="badge rounded-pill" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.72rem' }}>
              {summary.failedCount} failed — failures shown first
            </span>
          )}
        </div>
        <div className="card-body p-0" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="table table-hover align-middle mb-0">
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
              <tr>
                <th className="px-4 py-3 text-muted small fw-semibold border-0">Recipient</th>
                <th className="py-3 text-muted small fw-semibold border-0">Type</th>
                <th className="py-3 text-muted small fw-semibold border-0">SMS</th>
                <th className="py-3 text-muted small fw-semibold border-0">Push</th>
                <th className="py-3 text-muted small fw-semibold border-0 px-4">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sms = row.channels.find((c) => c.channel === 'sms')
                const push = row.channels.find((c) => c.channel === 'push')
                const email = row.channels.find((c) => c.channel === 'email')
                return (
                  <tr key={row.recipientId} style={row.hasFailure ? { background: '#fff8f8' } : {}}>
                    <td className="px-4 small fw-semibold">{row.recipientName}</td>
                    <td>
                      <span
                        className="badge rounded-pill"
                        style={
                          row.recipientType === 'guardian'
                            ? { background: '#e0e7ff', color: '#4338ca', fontSize: '0.68rem' }
                            : { background: '#d1fae5', color: '#065f46', fontSize: '0.68rem' }
                        }
                      >
                        {row.recipientType === 'guardian' ? 'Guardian' : 'Staff'}
                      </span>
                    </td>
                    <td>
                      {sms && (
                        <span title={sms.failureReason ?? ''}>
                          <ChannelBadge status={sms.status} channel="sms" />
                        </span>
                      )}
                    </td>
                    <td>
                      {push && (
                        <span title={push.failureReason ?? ''}>
                          <ChannelBadge status={push.status} channel="push" />
                        </span>
                      )}
                    </td>
                    <td className="px-4">
                      {email && (
                        <span title={email.failureReason ?? ''}>
                          <ChannelBadge status={email.status} channel="email" />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EmergencyAlertContent() {
  const { showNotification } = useNotificationContext()
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState<EmergencyAlertSummary | null>(null)
  const sendAlert = useSendEmergencyAlert()

  const handleSend = () => {
    if (!message.trim()) return
    if (
      !window.confirm(
        'This will IMMEDIATELY send an SMS, push notification, and email to ALL active guardians and staff.\n\nAre you sure you want to proceed?',
      )
    )
      return

    sendAlert.mutate(
      { message },
      {
        onSuccess: (data) => {
          setSummary(data)
          setMessage('')
          showNotification({
            variant: 'success',
            message: `Emergency alert dispatched to ${data.totalRecipients} recipients across ${data.totalChannels} channels. ${data.sentCount} delivered, ${data.failedCount} failed.`,
          })
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) => {
          showNotification({
            variant: 'danger',
            message: e?.response?.data?.message ?? 'Failed to dispatch emergency alert.',
          })
        },
      },
    )
  }

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={AlertTriangle}
        title="Emergency Alert"
        subtitle="Broadcasts instantly to all active guardians and staff via SMS, push, and email simultaneously"
        tone="critical"
      />

      {/* Warning banner */}
      <div
        className="alert d-flex align-items-center gap-3 rounded-4 border-0 mb-4"
        style={{ background: '#fff7ed', borderLeft: '4px solid #f97316' }}
      >
        <AlertTriangle size={20} color="#f97316" className="flex-shrink-0" />
        <div className="small">
          <strong>Use only for genuine emergencies.</strong> This action cannot be undone —
          every active guardian and staff member will receive a notification across all registered channels.
        </div>
      </div>

      {/* Compose card */}
      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-4"
          style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <Send size={15} /> Compose Emergency Message
          </span>
        </div>
        <div className="card-body p-4">
          <label className="form-label small fw-semibold">Message Body</label>
          <textarea
            className="form-control mb-1"
            rows={5}
            maxLength={MAX_CHARS}
            placeholder="Describe the emergency situation clearly and concisely…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ resize: 'vertical', fontSize: '0.9rem' }}
          />
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-muted small">{message.length}/{MAX_CHARS} characters</span>
            {message.length > MAX_CHARS * 0.9 && (
              <span className="text-warning small fw-semibold">Approaching limit</span>
            )}
          </div>

          <button
            className="btn fw-bold text-white d-flex align-items-center gap-2"
            style={{
              background: message.trim() && !sendAlert.isPending
                ? 'linear-gradient(135deg,#dc2626,#991b1b)'
                : '#cbd5e1',
              border: 'none',
              padding: '10px 24px',
            }}
            disabled={!message.trim() || sendAlert.isPending}
            onClick={handleSend}
          >
            {sendAlert.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                Dispatching to all recipients…
              </>
            ) : (
              <>
                <AlertTriangle size={15} />
                Send Emergency Alert
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delivery Report — shown after first successful send */}
      {summary && <DeliveryReport summary={summary} />}
    </div>
  )
}

export default function EmergencyAlertPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.PRINCIPAL]}>
      <EmergencyAlertContent />
    </RoleGuard>
  )
}
