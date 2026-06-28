import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MFA_REQUIRED_ROLES, ROLES, ROLE_HOME_PATHS } from '@/lib/auth/roles'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/api/axios', () => ({
  default: { post: vi.fn() },
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockSetUser = vi.fn()
const mockCompleteMfa = vi.fn()

const storeState = {
  user: null,
  permissions: [],
  isAuthenticated: false,
  mfaPending: true,
  mfaVerified: false,
  pendingLoginToken: 'pending-token',
  lastActivityAt: Date.now(),
  loginMethod: null,
  setUser: mockSetUser,
  setMfaPending: vi.fn(),
  clearUser: vi.fn(),
  completeMfa: mockCompleteMfa,
  updateActivity: vi.fn(),
  hasPermission: vi.fn(() => false),
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState
  ),
}))

import axiosMock from '@/lib/api/axios'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { MfaChallenge } from '../components/MfaChallenge'

const axiosPost = axiosMock.post as ReturnType<typeof vi.fn>

// ──────────────────────────────────────────────
// MFA_REQUIRED_ROLES constant tests (pure logic)
// ──────────────────────────────────────────────
describe('MFA_REQUIRED_ROLES constant', () => {
  it('includes Principal', () => {
    expect(MFA_REQUIRED_ROLES).toContain(ROLES.PRINCIPAL)
  })

  it('includes SystemAdmin', () => {
    expect(MFA_REQUIRED_ROLES).toContain(ROLES.SYSTEM_ADMIN)
  })

  it('includes SecurityOfficer', () => {
    expect(MFA_REQUIRED_ROLES).toContain(ROLES.SECURITY_OFFICER)
  })

  it('does NOT include Teacher', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.TEACHER)
  })

  it('does NOT include Student', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.STUDENT)
  })

  it('does NOT include Guardian', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.GUARDIAN)
  })

  it('does NOT include Librarian', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.LIBRARIAN)
  })

  it('does NOT include Accountant', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.ACCOUNTANT)
  })

  it('does NOT include SectionHead', () => {
    expect(MFA_REQUIRED_ROLES).not.toContain(ROLES.SECTION_HEAD)
  })
})

// ──────────────────────────────────────────────
// MfaChallenge component tests
// ──────────────────────────────────────────────
describe('MfaChallenge component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState.pendingLoginToken = 'pending-token'
  })

  it('renders the 6-digit code input and Verify button', () => {
    render(<MfaChallenge />)
    expect(screen.getByLabelText(/6-digit authentication code/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('valid 6-digit code → calls verify API, sets user, completes MFA', async () => {
    const mockFinalUser = {
      id: 'u-principal',
      email: 'principal@school.lk',
      firstName: 'Sunil',
      lastName: 'Fernando',
      role: ROLES.PRINCIPAL,
      schoolCode: 'SCH001',
    }
    axiosPost.mockResolvedValueOnce({
      data: { token: 'final-jwt', user: mockFinalUser },
    })
    ;(nextAuthSignIn as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    render(<MfaChallenge />)

    await userEvent.type(screen.getByLabelText(/6-digit authentication code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(axiosPost).toHaveBeenCalledWith('/auth/mfa/verify', {
        code: '123456',
        pendingToken: 'pending-token',
      })
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: ROLES.PRINCIPAL })
      )
      expect(mockCompleteMfa).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith(ROLE_HOME_PATHS[ROLES.PRINCIPAL])
    })
  })

  it('invalid code shows friendly inline error and does NOT redirect', async () => {
    axiosPost.mockRejectedValueOnce(new Error('invalid code'))

    render(<MfaChallenge />)
    await userEvent.type(screen.getByLabelText(/6-digit authentication code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/incorrect or expired/i)
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(mockSetUser).not.toHaveBeenCalled()
  })
})
