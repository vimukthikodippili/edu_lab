'use client'
import { useOffline } from '@/hooks/useOffline'

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useOffline()

  if (isOnline) return null

  return (
    <div
      className="alert alert-warning alert-dismissible mb-0 rounded-0 border-0 text-center py-2 px-3"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, fontSize: '0.85rem' }}
      role="alert"
    >
      <strong>You are offline.</strong> Changes will sync when you reconnect.
      {pendingCount > 0 && (
        <span className="ms-2 badge bg-warning text-dark">{pendingCount} pending</span>
      )}
    </div>
  )
}
