import type { Role } from '@/lib/auth/roles'
import type { Permission } from '@/lib/auth/permissions'

export type UserType = {
  id: string
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  token: string
}

export type SIMSUser = {
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
  mfaSetupRequired?: boolean
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: Role
      token: string
      schoolCode?: string
      mfaVerified: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    token: string
    firstName: string
    lastName: string
    schoolCode?: string
    mfaVerified: boolean
    mfaPending: boolean
    pendingToken?: string
    loginMethod?: 'email' | 'phone'
  }
}
