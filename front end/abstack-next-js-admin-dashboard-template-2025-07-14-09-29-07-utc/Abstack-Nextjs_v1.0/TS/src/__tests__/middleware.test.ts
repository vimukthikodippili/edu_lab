import { describe, it, expect } from 'vitest'
import { ROLES } from '@/lib/auth/roles'
import { getRoleFromPath, isPublicPath, isStaticAsset } from '@/lib/auth/middlewareUtils'

/**
 * Tests for the pure middleware helper functions.
 * The Next.js middleware itself (Edge runtime) is tested via E2E tests;
 * these unit tests verify the role-path mapping and public-path logic.
 */

describe('getRoleFromPath', () => {
  it('returns null for root path', () => {
    expect(getRoleFromPath('/')).toBeNull()
  })

  it('returns TEACHER for /teacher', () => {
    expect(getRoleFromPath('/teacher')).toBe(ROLES.TEACHER)
  })

  it('returns TEACHER for /teacher/attendance', () => {
    expect(getRoleFromPath('/teacher/attendance')).toBe(ROLES.TEACHER)
  })

  it('returns PRINCIPAL for /principal', () => {
    expect(getRoleFromPath('/principal')).toBe(ROLES.PRINCIPAL)
  })

  it('returns SECURITY_OFFICER for /security', () => {
    expect(getRoleFromPath('/security')).toBe(ROLES.SECURITY_OFFICER)
  })

  it('returns SECTION_HEAD for /section-head', () => {
    expect(getRoleFromPath('/section-head')).toBe(ROLES.SECTION_HEAD)
  })

  it('returns LIBRARIAN for /library', () => {
    expect(getRoleFromPath('/library')).toBe(ROLES.LIBRARIAN)
  })

  it('returns ACCOUNTANT for /accounts', () => {
    expect(getRoleFromPath('/accounts')).toBe(ROLES.ACCOUNTANT)
  })

  it('returns STUDENT for /student', () => {
    expect(getRoleFromPath('/student')).toBe(ROLES.STUDENT)
  })

  it('returns GUARDIAN for /guardian', () => {
    expect(getRoleFromPath('/guardian')).toBe(ROLES.GUARDIAN)
  })

  it('strips locale prefix before matching', () => {
    expect(getRoleFromPath('/en/teacher')).toBe(ROLES.TEACHER)
    expect(getRoleFromPath('/si/principal')).toBe(ROLES.PRINCIPAL)
    expect(getRoleFromPath('/ta/student')).toBe(ROLES.STUDENT)
  })

  it('returns null for /auth/login', () => {
    expect(getRoleFromPath('/auth/login')).toBeNull()
  })

  it('returns null for /dashboard (shared path)', () => {
    expect(getRoleFromPath('/dashboard')).toBeNull()
  })
})

describe('isPublicPath', () => {
  it('returns true for /auth/login', () => {
    expect(isPublicPath('/auth/login')).toBe(true)
  })

  it('returns true for /auth/forgot-password', () => {
    expect(isPublicPath('/auth/forgot-password')).toBe(true)
  })

  it('returns true for /403', () => {
    expect(isPublicPath('/403')).toBe(true)
  })

  it('returns false for /teacher', () => {
    expect(isPublicPath('/teacher')).toBe(false)
  })

  it('returns false for /principal/reports', () => {
    expect(isPublicPath('/principal/reports')).toBe(false)
  })
})

describe('isStaticAsset', () => {
  it('returns true for /_next/static/chunks/page.js', () => {
    expect(isStaticAsset('/_next/static/chunks/page.js')).toBe(true)
  })

  it('returns true for /favicon.ico', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true)
  })

  it('returns false for /teacher', () => {
    expect(isStaticAsset('/teacher')).toBe(false)
  })
})

describe('403 enforcement — role mismatch detection', () => {
  it('teacher accessing /principal should trigger 403 (roles differ)', () => {
    const pathRole = getRoleFromPath('/principal')
    const userRole = ROLES.TEACHER
    expect(pathRole).not.toBeNull()
    expect(pathRole !== userRole).toBe(true)
  })

  it('teacher accessing /teacher should pass through (roles match)', () => {
    const pathRole = getRoleFromPath('/teacher')
    const userRole = ROLES.TEACHER
    expect(pathRole === userRole).toBe(true)
  })

  it('student accessing /teacher should trigger 403 (roles differ)', () => {
    const pathRole = getRoleFromPath('/teacher')
    const userRole = ROLES.STUDENT
    expect(pathRole !== userRole).toBe(true)
  })

  it('security officer accessing /security should pass through', () => {
    const pathRole = getRoleFromPath('/security')
    const userRole = ROLES.SECURITY_OFFICER
    expect(pathRole === userRole).toBe(true)
  })

  it('accountant accessing /principal should trigger 403', () => {
    const pathRole = getRoleFromPath('/principal')
    const userRole = ROLES.ACCOUNTANT
    expect(pathRole !== userRole).toBe(true)
  })
})
