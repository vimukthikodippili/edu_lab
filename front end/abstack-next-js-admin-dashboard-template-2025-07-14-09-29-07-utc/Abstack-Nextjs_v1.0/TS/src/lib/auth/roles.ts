export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  PRINCIPAL: 'principal',
  SECTION_HEAD: 'section_head',
  TEACHER: 'teacher',
  STUDENT: 'student',
  GUARDIAN: 'guardian',
  COUNSELOR: 'counselor',
  SECURITY_OFFICER: 'security_officer',
  LIBRARIAN: 'librarian',
  ACCOUNTANT: 'accountant',
  SCHOOL_PSYCHOLOGIST: 'school_psychologist',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const MFA_REQUIRED_ROLES: Role[] = [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECURITY_OFFICER]

export const ROLE_LABELS: Record<Role, string> = {
  system_admin: 'System Admin',
  principal: 'Principal',
  section_head: 'Section Head',
  teacher: 'Teacher',
  student: 'Student',
  guardian: 'Parent / Guardian',
  counselor: 'Counselor',
  security_officer: 'Security Officer',
  librarian: 'Librarian',
  accountant: 'Accountant',
  school_psychologist: 'School Psychologist',
}

export const ROLE_HOME_PATHS: Record<Role, string> = {
  system_admin: '/admin',
  principal: '/principal',
  section_head: '/section-head',
  teacher: '/teacher',
  student: '/student',
  guardian: '/guardian',
  counselor: '/counselor',
  security_officer: '/security',
  librarian: '/library',
  accountant: '/accounts',
  school_psychologist: '/school-psychologist',
}

export const ROLE_PATH_PREFIXES: Record<string, Role> = {
  '/admin': ROLES.SYSTEM_ADMIN,
  '/principal': ROLES.PRINCIPAL,
  '/section-head': ROLES.SECTION_HEAD,
  '/teacher': ROLES.TEACHER,
  '/student': ROLES.STUDENT,
  '/guardian': ROLES.GUARDIAN,
  '/counselor': ROLES.COUNSELOR,
  '/security': ROLES.SECURITY_OFFICER,
  '/library': ROLES.LIBRARIAN,
  '/accounts': ROLES.ACCOUNTANT,
  '/school-psychologist': ROLES.SCHOOL_PSYCHOLOGIST,
}

/** Minutes of inactivity before automatic sign-out, per role */
export const ROLE_INACTIVITY_TIMEOUT: Record<Role, number> = {
  system_admin: 15,
  principal: 20,
  section_head: 30,
  teacher: 60,
  student: 60,
  guardian: 60,
  counselor: 30,
  security_officer: 15,
  librarian: 45,
  accountant: 20,
  school_psychologist: 30,
}
