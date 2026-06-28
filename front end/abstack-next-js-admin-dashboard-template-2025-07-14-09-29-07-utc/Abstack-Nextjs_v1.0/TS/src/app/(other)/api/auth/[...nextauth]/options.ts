import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { ROLES, type Role } from '@/lib/auth/roles'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

// Backend returns role as { id: number, name: string }; map to SIMS Role string
function normalizeRole(backendRole: unknown): Role {
  if (typeof backendRole === 'string' && backendRole !== '[object Object]') {
    return backendRole as Role
  }
  if (typeof backendRole === 'object' && backendRole !== null) {
    const r = backendRole as { id?: number }
    const idMap: Record<number, Role> = {
      1: ROLES.SYSTEM_ADMIN,
      3: ROLES.PRINCIPAL,
      4: ROLES.SECTION_HEAD,
      5: ROLES.TEACHER,
      6: ROLES.STUDENT,
      7: ROLES.GUARDIAN,
      8: ROLES.COUNSELOR,
      9: ROLES.SECURITY_OFFICER,
      10: ROLES.LIBRARIAN,
      11: ROLES.ACCOUNTANT,
    }
    if (r.id !== undefined && idMap[r.id]) return idMap[r.id]
  }
  return ROLES.STUDENT
}

async function fetchBackend(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Authentication failed. Please try again.')
  }
  return res.json()
}

export const options: NextAuthOptions = {
  providers: [
    // Step 1 — email/password or phone/password login
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
        loginMethod: { label: 'Login Method', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.password) throw new Error('Password is required')

        let data: Record<string, unknown>

        if (credentials.loginMethod === 'phone') {
          if (!credentials.phone) throw new Error('Phone number is required')
          data = await fetchBackend('/auth/phone/login', {
            phone: credentials.phone,
            password: credentials.password,
          })
        } else {
          if (!credentials.email) throw new Error('Email is required')
          data = await fetchBackend('/auth/email/login', {
            email: credentials.email,
            password: credentials.password,
          })
        }

        if (data.mfaRequired) {
          return {
            id: data.userId as string,
            email: (data.email as string) ?? '',
            firstName: data.firstName as string,
            lastName: data.lastName as string,
            role: data.role as Role,
            token: '',
            mfaPending: true,
            mfaVerified: false,
            pendingToken: data.pendingToken as string,
            loginMethod: credentials.loginMethod ?? 'email',
          }
        }

        const user = data.user as Record<string, unknown>
        return {
          id: user.id as string,
          email: (user.email as string) ?? '',
          firstName: user.firstName as string,
          lastName: user.lastName as string,
          role: normalizeRole(user.role),
          token: data.token as string,
          refreshToken: data.refreshToken as string | undefined,
          schoolCode: user.schoolCode as string | undefined,
          mfaPending: false,
          mfaVerified: false,
          loginMethod: credentials.loginMethod ?? 'email',
        }
      },
    }),

    // Step 2 — TOTP verified; frontend calls this with the final backend JWT
    CredentialsProvider({
      id: 'mfa-verified',
      name: 'mfa-verified',
      credentials: {
        finalToken: { label: 'Final Token', type: 'text' },
        userId: { label: 'User ID', type: 'text' },
        email: { label: 'Email', type: 'email' },
        firstName: { label: 'First Name', type: 'text' },
        lastName: { label: 'Last Name', type: 'text' },
        role: { label: 'Role', type: 'text' },
        schoolCode: { label: 'School Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.finalToken || !credentials.userId) {
          throw new Error('Invalid MFA verification')
        }
        return {
          id: credentials.userId,
          email: credentials.email ?? '',
          firstName: credentials.firstName ?? '',
          lastName: credentials.lastName ?? '',
          role: credentials.role as Role,
          token: credentials.finalToken,
          schoolCode: credentials.schoolCode,
          mfaPending: false,
          mfaVerified: true,
          loginMethod: 'email',
        }
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as Record<string, unknown>
        token.id = u.id as string
        token.role = u.role as Role
        token.token = (u.token as string) ?? ''
        token.firstName = u.firstName as string
        token.lastName = u.lastName as string
        token.schoolCode = u.schoolCode as string | undefined
        token.mfaPending = (u.mfaPending as boolean) ?? false
        token.mfaVerified = (u.mfaVerified as boolean) ?? false
        token.pendingToken = u.pendingToken as string | undefined
        token.loginMethod = (u.loginMethod as 'email' | 'phone') ?? 'email'
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email ?? '',
        firstName: token.firstName,
        lastName: token.lastName,
        role: token.role,
        token: token.token,
        schoolCode: token.schoolCode,
        mfaVerified: token.mfaVerified,
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours absolute max; inactivity enforced client-side
  },
}
