import { ROLES, type Role } from './roles'

// Backend returns role as { id: number, name: string }; single source of truth for mapping
// that onto the frontend's Role string — shared by useSignIn.ts and the NextAuth credentials
// provider so the id->Role map is never duplicated (a missing entry here silently misroutes
// that role to the Student dashboard, as happened with School Psychologist / id 12).
const ROLE_ID_MAP: Record<number, Role> = {
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
  12: ROLES.SCHOOL_PSYCHOLOGIST,
}

export function normalizeRole(backendRole: unknown): Role {
  if (typeof backendRole === 'string' && backendRole !== '[object Object]') {
    return backendRole as Role
  }
  if (typeof backendRole === 'object' && backendRole !== null) {
    const r = backendRole as { id?: number }
    if (r.id !== undefined && ROLE_ID_MAP[r.id]) return ROLE_ID_MAP[r.id]
  }
  return ROLES.STUDENT
}
