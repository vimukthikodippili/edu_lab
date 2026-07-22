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

// ─── Targeted Messaging (Principal composes one message, targets specific parents/teachers) ──

export interface RecipientCriteria {
  allParents?: boolean
  allTeachers?: boolean
  gradeIds?: number[]
  classSectionIds?: number[]
  guardianIds?: string[]
  staffIds?: string[]
}

export interface RecipientPreview {
  parentCount: number
  teacherCount: number
  total: number
}

export interface SendTargetedMessagePayload extends RecipientCriteria {
  subject: string
  body: string
  channelSms: boolean
  channelEmail: boolean
  channelPush: boolean
}

export interface TargetedMessage {
  id: string
  sentByStaffId: string
  sentByStaff: { id: string; firstName: string; lastName: string }
  subject: string
  body: string
  channelSms: boolean
  channelEmail: boolean
  channelPush: boolean
  recipientCount: number
  sentAt: string
}

export interface TargetedMessageHistoryRow extends TargetedMessage {
  sentCount: number
  failedCount: number
}

export interface TargetedMessageRecipient {
  id: string
  targetedMessageId: string
  recipientType: 'parent' | 'teacher'
  recipientId: string
  recipientName: string
  channel: 'sms' | 'email' | 'push'
  deliveryStatus: 'pending' | 'sent' | 'failed'
  deliveredAt: string | null
  failureReason: string | null
  createdAt: string
}

export interface TargetedMessageDetail {
  message: TargetedMessage
  recipients: TargetedMessageRecipient[]
}
