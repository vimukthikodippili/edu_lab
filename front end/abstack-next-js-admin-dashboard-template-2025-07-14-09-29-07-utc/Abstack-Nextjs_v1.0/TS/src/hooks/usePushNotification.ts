'use client'
import { useCallback } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/pwa/push-notifications'

export function usePushNotification() {
  const { pushSubscribed, setPushSubscribed } = useNotificationStore()

  const subscribe = useCallback(async () => {
    const subscription = await subscribeToPushNotifications()
    if (subscription) {
      setPushSubscribed(true)
    }
    return subscription
  }, [setPushSubscribed])

  const unsubscribe = useCallback(async () => {
    const success = await unsubscribeFromPushNotifications()
    if (success) setPushSubscribed(false)
    return success
  }, [setPushSubscribed])

  return { pushSubscribed, subscribe, unsubscribe }
}
