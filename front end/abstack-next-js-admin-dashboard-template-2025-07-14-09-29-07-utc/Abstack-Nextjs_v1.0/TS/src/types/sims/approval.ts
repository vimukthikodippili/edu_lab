export type ApprovalItemType = 'fee_waiver' | 'leave' | 'expense'

export interface ApprovalQueueItem {
  id: string
  type: ApprovalItemType
  requesterName: string
  requesterDetail: string
  summary: string
  reason: string
  submittedAt: string
  status: string
}
