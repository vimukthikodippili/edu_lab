import { create } from 'zustand'

export interface OfflineAction {
  id: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  data: unknown
  createdAt: number
}

interface OfflineState {
  isOnline: boolean
  pendingActions: OfflineAction[]
  setOnline: (online: boolean) => void
  queueAction: (action: Omit<OfflineAction, 'id' | 'createdAt'>) => void
  removeAction: (id: string) => void
  clearQueue: () => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingActions: [],

  setOnline: (online) => set({ isOnline: online }),

  queueAction: (action) =>
    set((state) => ({
      pendingActions: [
        ...state.pendingActions,
        {
          ...action,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          createdAt: Date.now(),
        },
      ],
    })),

  removeAction: (id) =>
    set((state) => ({
      pendingActions: state.pendingActions.filter((a) => a.id !== id),
    })),

  clearQueue: () => set({ pendingActions: [] }),
}))
