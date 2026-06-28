'use client'
import { useEffect } from 'react'
import { useOfflineStore } from '@/stores/offlineStore'

export function useOffline() {
  const { isOnline, setOnline, pendingActions } = useOfflineStore()

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sync initial state in case it changed before mount
    setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return { isOnline, pendingCount: pendingActions.length }
}
