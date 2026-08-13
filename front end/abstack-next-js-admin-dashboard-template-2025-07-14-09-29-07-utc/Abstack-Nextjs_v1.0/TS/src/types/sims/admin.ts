export interface RecentActivityRow {
  id: string
  actorId: string
  actorName: string
  action: string
  targetType: string
  targetId: string
  reason: string | null
  createdAt: string
}
