export interface AlertChannelResult {
  recipientType: 'guardian' | 'staff'
  recipientId: string
  recipientName: string
  channel: 'sms' | 'push' | 'email'
  status: 'sent' | 'failed'
  failureReason?: string
}

export interface EmergencyAlertSummary {
  alertId: string
  sentAt: string
  totalRecipients: number
  totalChannels: number
  sentCount: number
  failedCount: number
  results: AlertChannelResult[]
}

export interface NotificationLog {
  id: string
  alertId: string
  recipientType: 'guardian' | 'staff'
  recipientId: string
  recipientName: string
  channel: 'sms' | 'push' | 'email'
  status: 'sent' | 'failed'
  failureReason: string | null
  createdAt: string
}
