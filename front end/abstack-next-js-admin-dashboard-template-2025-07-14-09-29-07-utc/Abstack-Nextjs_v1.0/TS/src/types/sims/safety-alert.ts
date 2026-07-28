export type DeliveryChannel = 'sms' | 'push'
export type DeliveryStatus = 'queued' | 'sent' | 'failed' | 'retrying'

export interface SafetyAlert {
  id: string
  alertId: string
  sessionId: string
  caseNumber: string
  studentId: string
  studentName: string
  recipientStaffId: string
  recipientName: string
  channel: DeliveryChannel
  status: DeliveryStatus
  attempts: number
  lastAttemptAt: string | null
  createdAt: string
}

export const DELIVERY_STATUS_BADGE_CLASS: Record<DeliveryStatus, string> = {
  queued: 'bg-light text-muted border',
  sent: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  retrying: 'bg-orange-subtle text-orange-emphasis border border-orange-subtle',
  failed: 'bg-danger text-white border-0',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  retrying: 'Retrying',
  failed: 'Failed',
}

export const DELIVERY_CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  sms: 'SMS',
  push: 'Push',
}
