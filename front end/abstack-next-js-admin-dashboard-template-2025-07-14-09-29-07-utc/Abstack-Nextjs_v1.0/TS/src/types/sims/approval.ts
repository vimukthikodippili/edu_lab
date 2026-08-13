export type ApprovalItemType = 'fee_waiver' | 'leave' | 'expense' | 'mark_correction'

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

export interface ApprovalHistoryItem extends ApprovalQueueItem {
  decidedByName: string
  decidedAt: string
  decisionNote: string | null
}
