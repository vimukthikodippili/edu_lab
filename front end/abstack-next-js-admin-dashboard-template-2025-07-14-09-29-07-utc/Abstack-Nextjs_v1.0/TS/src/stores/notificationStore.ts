import { create } from 'zustand'

export interface Notification {
  id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  createdAt: number
  link?: string
}

interface NotificationState {
  notifications: Notification[]
  pushSubscribed: boolean
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
  setPushSubscribed: (subscribed: boolean) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  pushSubscribed: false,
  unreadCount: 0,

  addNotification: (notification) =>
    set((state) => {
      const newItem: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        read: false,
        createdAt: Date.now(),
      }
      const notifications = [newItem, ...state.notifications].slice(0, 50)
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    }),

  markRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((n) => n.id !== id)
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    }),

  setPushSubscribed: (subscribed) => set({ pushSubscribed: subscribed }),
}))
