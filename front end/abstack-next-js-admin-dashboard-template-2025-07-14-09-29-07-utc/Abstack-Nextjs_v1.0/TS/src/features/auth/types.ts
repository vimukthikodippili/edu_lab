import type { Role } from '@/lib/auth/roles'

export interface LoginPayload {
  loginId: string
  password: string
  loginType: 'email' | 'phone'
}

export interface LoginResponse {
  mfaRequired: boolean
  /** Present only when mfaRequired is true */
  pendingToken?: string
  userId?: string
  email?: string
  firstName?: string
  lastName?: string
  role?: Role
  /** Present only when mfaRequired is false */
  token?: string
  refreshToken?: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: Role
    schoolCode?: string
    mfaEnabled: boolean
    mfaSetupRequired: boolean
  }
}

export interface MfaVerifyPayload {
  code: string
  pendingToken: string
}

export interface MfaVerifyResponse {
  token: string
  refreshToken?: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: Role
    schoolCode?: string
  }
}

export interface MfaSetupResponse {
  qrCodeUri: string
  secret: string
  backupCodes: string[]
}

export type LoginFormValues = {
  loginId: string
  password: string
  loginType: 'email' | 'phone'
}

export type MfaFormValues = {
  code: string
}
