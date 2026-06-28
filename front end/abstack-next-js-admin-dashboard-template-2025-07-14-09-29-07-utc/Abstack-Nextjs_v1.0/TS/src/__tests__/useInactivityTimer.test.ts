import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ROLES, ROLE_INACTIVITY_TIMEOUT } from '@/lib/auth/roles'

// Mock next-auth signOut
const mockSignOut = vi.fn()
vi.mock('next-auth/react', () => ({
  signOut: mockSignOut,
}))

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Shared mutable state so both the hook mock and getState() see the same values
let mockUser: { role: string } | null = null
let mockLastActivityAt = Date.now()
const mockUpdateActivity = vi.fn(() => {
  mockLastActivityAt = Date.now()
})
const mockClearUser = vi.fn()

const mockStoreState = () => ({
  user: mockUser,
  updateActivity: mockUpdateActivity,
  clearUser: mockClearUser,
  lastActivityAt: mockLastActivityAt,
})

// useAuthStore is called two ways:
//   1. useAuthStore(selector) — hook usage
//   2. useAuthStore.getState()  — inside the interval callback
const mockUseAuthStore = vi.fn((selector: (s: ReturnType<typeof mockStoreState>) => unknown) =>
  selector(mockStoreState())
)
Object.assign(mockUseAuthStore, {
  getState: () => mockStoreState(),
})

vi.mock('@/stores/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}))

import { useInactivityTimer } from '@/hooks/useInactivityTimer'

describe('useInactivityTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockLastActivityAt = Date.now()
    mockSignOut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not sign out when user is null', async () => {
    mockUser = null
    renderHook(() => useInactivityTimer())

    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000)
    })

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('signs out SystemAdmin after 15 minutes of inactivity', async () => {
    mockUser = { role: ROLES.SYSTEM_ADMIN }
    const timeoutMs = ROLE_INACTIVITY_TIMEOUT[ROLES.SYSTEM_ADMIN] * 60 * 1000

    mockLastActivityAt = Date.now()
    renderHook(() => useInactivityTimer())

    // Just before timeout — should NOT sign out
    await act(async () => {
      vi.advanceTimersByTime(timeoutMs - 1000)
    })
    expect(mockSignOut).not.toHaveBeenCalled()

    // Past timeout — should sign out on next 60s tick
    await act(async () => {
      vi.advanceTimersByTime(62_000)
    })
    await act(async () => { await Promise.resolve() })

    expect(mockClearUser).toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
    expect(mockPush).toHaveBeenCalledWith('/auth/login?reason=timeout')
  })

  it('signs out Teacher after 60 minutes of inactivity', async () => {
    mockUser = { role: ROLES.TEACHER }
    const timeoutMs = ROLE_INACTIVITY_TIMEOUT[ROLES.TEACHER] * 60 * 1000

    mockLastActivityAt = Date.now()
    renderHook(() => useInactivityTimer())

    await act(async () => {
      vi.advanceTimersByTime(timeoutMs + 60_000)
    })
    await act(async () => { await Promise.resolve() })

    expect(mockClearUser).toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false })
  })

  it('resets the timer on user activity', async () => {
    mockUser = { role: ROLES.SYSTEM_ADMIN }
    const timeoutMs = ROLE_INACTIVITY_TIMEOUT[ROLES.SYSTEM_ADMIN] * 60 * 1000

    mockLastActivityAt = Date.now()
    renderHook(() => useInactivityTimer())

    // Advance half-way
    await act(async () => {
      vi.advanceTimersByTime(timeoutMs / 2)
    })

    // Simulate activity — reset lastActivityAt
    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'))
      mockLastActivityAt = Date.now()
    })

    // Advance another half — timer was reset so should NOT sign out
    await act(async () => {
      vi.advanceTimersByTime(timeoutMs / 2)
    })

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('INACTIVITY_TIMEOUT_OVERRIDE env overrides role-specific timeout', async () => {
    mockUser = { role: ROLES.TEACHER }
    const overrideMs = 2 * 60 * 1000 // 2 minutes instead of 60

    vi.stubEnv('NEXT_PUBLIC_INACTIVITY_TIMEOUT_OVERRIDE', String(overrideMs))
    mockLastActivityAt = Date.now()

    renderHook(() => useInactivityTimer())

    await act(async () => {
      vi.advanceTimersByTime(overrideMs + 60_000)
    })
    await act(async () => { await Promise.resolve() })

    expect(mockSignOut).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
