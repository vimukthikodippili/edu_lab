import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role } from '@/lib/auth/roles'
import type { Permission } from '@/lib/auth/permissions'
import { getUserPermissions } from '@/lib/auth/permissions'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  token: string
  refreshToken?: string
  schoolCode?: string
  gradeLevel?: number
  mfaEnabled?: boolean
}

interface AuthState {
  user: AuthUser | null
  permissions: Permission[]
  isAuthenticated: boolean
  mfaPending: boolean
  mfaVerified: boolean
  pendingLoginToken: string | null
  lastActivityAt: number
  loginMethod: 'email' | 'phone' | null

  setUser: (user: AuthUser) => void
  clearUser: () => void
  hasPermission: (permission: Permission) => boolean
  setMfaPending: (pendingToken: string) => void
  completeMfa: () => void
  updateActivity: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      isAuthenticated: false,
      mfaPending: false,
      mfaVerified: false,
      pendingLoginToken: null,
      lastActivityAt: Date.now(),
      loginMethod: null,

      setUser: (user) =>
        set({
          user,
          permissions: getUserPermissions(user.role),
          isAuthenticated: true,
          mfaPending: false,
          lastActivityAt: Date.now(),
        }),

      clearUser: () =>
        set({
          user: null,
          permissions: [],
          isAuthenticated: false,
          mfaPending: false,
          mfaVerified: false,
          pendingLoginToken: null,
          loginMethod: null,
        }),

      hasPermission: (permission) => get().permissions.includes(permission),

      setMfaPending: (pendingToken) =>
        set({
          mfaPending: true,
          mfaVerified: false,
          pendingLoginToken: pendingToken,
        }),

      completeMfa: () =>
        set({
          mfaPending: false,
          mfaVerified: true,
          pendingLoginToken: null,
          lastActivityAt: Date.now(),
        }),

      updateActivity: () => set({ lastActivityAt: Date.now() }),
    }),
    {
      name: 'sims-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        mfaPending: state.mfaPending,
        mfaVerified: state.mfaVerified,
        pendingLoginToken: state.pendingLoginToken,
        lastActivityAt: state.lastActivityAt,
        loginMethod: state.loginMethod,
      }),
    }
  )
)
