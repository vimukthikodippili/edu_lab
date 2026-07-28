import { ROLE_PATH_PREFIXES } from './roles'
import type { Role } from './roles'

export const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/recover-password',
  '/auth/sign-in',
  '/auth/register',
  '/403',
]

const STATIC_PREFIXES = ['/_next', '/icons', '/sw.js', '/favicon.ico']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.endsWith(p) || pathname.startsWith(p + '/'))
}

export function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname.includes('.')
}

// Paths accessible to multiple roles — skip the single-role prefix guard here;
// the page-level RoleGuard handles authorization instead.
export const SHARED_PATH_PREFIXES = [
  '/security/gate-terminal',
  '/security/incidents',
  '/principal/live-class-monitor',
  '/principal/sports-dashboard',
  '/admin/settings',
  '/admin/sports',
  '/admin/labs',
  '/admin/lab-types',
  '/admin/lab-overview',
  '/admin/mha/disorder-registry',
  '/admin/mha/assessment-matrix',
  '/admin/students',
  '/admin/events',
  '/counselor/mha-sessions',
]

export function getRoleFromPath(pathname: string): Role | null {
  const stripped = pathname.replace(/^\/(en|si|ta)/, '')
  if (SHARED_PATH_PREFIXES.some(p => stripped === p || stripped.startsWith(p + '/'))) {
    return null
  }
  for (const [prefix, role] of Object.entries(ROLE_PATH_PREFIXES)) {
    if (stripped === prefix || stripped.startsWith(prefix + '/')) {
      return role
    }
  }
  return null
}
