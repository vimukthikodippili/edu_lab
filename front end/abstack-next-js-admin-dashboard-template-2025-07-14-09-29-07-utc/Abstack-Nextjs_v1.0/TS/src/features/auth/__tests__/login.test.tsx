import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/api/axios', () => ({
  default: { post: vi.fn() },
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}))

const mockSetUser = vi.fn()
const mockSetMfaPending = vi.fn()
const mockClearUser = vi.fn()
const mockCompleteMfa = vi.fn()
const mockUpdateActivity = vi.fn()

const storeState = {
  user: null,
  permissions: [],
  isAuthenticated: false,
  mfaPending: false,
  mfaVerified: false,
  pendingLoginToken: null,
  lastActivityAt: Date.now(),
  loginMethod: null,
  setUser: mockSetUser,
  setMfaPending: mockSetMfaPending,
  clearUser: mockClearUser,
  completeMfa: mockCompleteMfa,
  updateActivity: mockUpdateActivity,
  hasPermission: vi.fn(() => false),
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState
  ),
}))

// libphonenumber-js mock — avoid full validation in tests
vi.mock('libphonenumber-js', () => ({
  isValidPhoneNumber: vi.fn(() => true),
}))

import axiosMock from '@/lib/api/axios'
import { signIn as nextAuthSignIn } from 'next-auth/react'
import { LoginForm } from '../components/LoginForm'
import { ROLES, ROLE_HOME_PATHS } from '@/lib/auth/roles'

const axiosPost = axiosMock.post as ReturnType<typeof vi.fn>

function renderLoginForm() {
  return render(<LoginForm />)
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and phone toggle tabs', () => {
    renderLoginForm()
    expect(screen.getByRole('tab', { name: /email/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /phone/i })).toBeInTheDocument()
  })

  it('shows email input by default', () => {
    renderLoginForm()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('switches to phone input when Phone tab is clicked', async () => {
    renderLoginForm()
    await userEvent.click(screen.getByRole('tab', { name: /phone/i }))
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
  })

  it('successful email login sets user in store and redirects to role home', async () => {
    const mockUser = {
      id: 'u1',
      email: 'teacher@school.lk',
      firstName: 'Nimal',
      lastName: 'Perera',
      role: ROLES.TEACHER,
      schoolCode: 'SCH001',
      mfaEnabled: false,
      mfaSetupRequired: false,
    }
    axiosPost.mockResolvedValueOnce({
      data: { mfaRequired: false, token: 'jwt-token', user: mockUser },
    })
    ;(nextAuthSignIn as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    renderLoginForm()
    await userEvent.type(screen.getByLabelText(/email address/i), 'teacher@school.lk')
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: ROLES.TEACHER })
      )
      expect(mockPush).toHaveBeenCalledWith(ROLE_HOME_PATHS[ROLES.TEACHER])
    })
  })

  it('shows a friendly error message on wrong password', async () => {
    axiosPost.mockRejectedValueOnce(new Error('Invalid credentials'))

    renderLoginForm()
    await userEvent.type(screen.getByLabelText(/email address/i), 'teacher@school.lk')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/wrong password/i)
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('phone login calls /auth/phone/login endpoint', async () => {
    const mockUser = {
      id: 'u2',
      email: 'parent@school.lk',
      firstName: 'Kamala',
      lastName: 'Silva',
      role: ROLES.GUARDIAN,
      mfaEnabled: false,
      mfaSetupRequired: false,
    }
    axiosPost.mockResolvedValueOnce({
      data: { mfaRequired: false, token: 'jwt-phone-token', user: mockUser },
    })
    ;(nextAuthSignIn as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

    renderLoginForm()
    await userEvent.click(screen.getByRole('tab', { name: /phone/i }))
    await userEvent.type(screen.getByLabelText(/phone number/i), '+94771234567')
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(axiosPost).toHaveBeenCalledWith(
        '/auth/phone/login',
        expect.objectContaining({ phone: '+94771234567' })
      )
    })
  })

  it('redirects to /auth/mfa when mfaRequired is true and does NOT set user', async () => {
    axiosPost.mockResolvedValueOnce({
      data: {
        mfaRequired: true,
        pendingToken: 'pending-jwt',
        userId: 'u3',
        role: ROLES.PRINCIPAL,
        firstName: 'Sunil',
        lastName: 'Fernando',
      },
    })

    renderLoginForm()
    await userEvent.type(screen.getByLabelText(/email address/i), 'principal@school.lk')
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSetMfaPending).toHaveBeenCalledWith('pending-jwt')
      expect(mockPush).toHaveBeenCalledWith('/auth/mfa')
      expect(mockSetUser).not.toHaveBeenCalled()
    })
  })
})
