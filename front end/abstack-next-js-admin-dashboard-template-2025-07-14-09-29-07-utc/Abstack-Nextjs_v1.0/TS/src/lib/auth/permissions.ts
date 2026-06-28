import { ROLES, Role } from './roles'

const {
  SYSTEM_ADMIN: SA,
  PRINCIPAL: PR,
  SECTION_HEAD: SH,
  TEACHER: TE,
  STUDENT: ST,
  GUARDIAN: GU,
  COUNSELOR: CO,
  SECURITY_OFFICER: SO,
  LIBRARIAN: LI,
  ACCOUNTANT: AC,
} = ROLES

export const PERMISSIONS = {
  // Students
  'students:create': [SA, PR],
  'students:read:own': [ST, GU],
  'students:read:class': [TE, CO, SH],
  'students:read:section': [SA, PR, SH],
  'students:read:all': [SA, PR],
  'students:update': [SA, PR],
  'students:promote': [PR],
  'students:generate-id': [SA, PR],
  'students:link-guardian': [SA, PR],

  // Teachers
  'teachers:create': [SA, PR],
  'teachers:read:all': [SA, PR],
  'teachers:read:section': [SA, PR, SH],
  'teachers:update': [SA, PR],
  'teachers:payroll:view': [SA, PR, TE],
  'teachers:payroll:manage': [SA, PR],

  // Attendance
  'attendance:mark': [TE, PR],
  'attendance:mark:bulk': [PR],
  'attendance:view:own': [ST, GU],
  'attendance:view:class': [TE, PR],
  'attendance:view:section': [SA, PR, SH],
  'attendance:view:all': [SA, PR],
  'attendance:reports': [SA, PR, TE, SH],

  // Grades
  'grades:enter': [TE, PR],
  'grades:publish': [PR],
  'grades:view:own': [ST, GU],
  'grades:view:class': [TE, PR],
  'grades:view:section': [SA, PR, SH],
  'grades:view:all': [SA, PR],
  'grades:correction-workflow': [PR],

  // Section / Class management (SectionHead)
  'section:reports': [PR, SH],
  'section:manage': [SA, PR, SH],

  // Fees
  'fees:manage': [SA, PR, AC],
  'fees:view:own': [GU, ST],
  'fees:approve-discount': [PR, AC],
  'fees:reports': [SA, PR, AC],

  // Payroll
  'payroll:view': [SA, PR, AC],
  'payroll:process': [SA, PR, AC],

  // Library
  'library:manage': [SA, PR, LI],
  'library:issue-return': [SA, PR, LI],
  'library:fines:waive': [PR, LI],
  'library:view': [SA, PR, TE, ST, LI],

  // Timetable
  'timetable:generate': [PR, SA],
  'timetable:view': [TE, ST, GU, PR, SA, SH],
  'timetable:assign-substitute': [PR, SA],

  // Communication
  'communication:send:all': [SA, PR],
  'communication:send:class': [TE, PR],
  'communication:emergency-alert': [PR, SA],
  'communication:view': [SA, PR, TE, ST, GU, CO, SH, LI, AC, SO],

  // Principal Dashboard
  'dashboard:kpi': [PR, SA],
  'dashboard:approvals': [PR],
  'dashboard:strategic': [PR, SA],

  // Biometric / Gate
  'biometric:scan': [SA, PR, SO],
  'biometric:enroll': [SA, PR],
  'biometric:audit': [PR, SA, SO],
  'biometric:blacklist': [PR, SA],
  'gate:log': [SO, PR, SA],

  // Syllabus
  'syllabus:manage': [TE, PR],
  'syllabus:view': [SA, PR, TE, ST],
  'diary:write': [TE],
  'diary:view': [SA, PR, TE],

  // Analytics
  'analytics:student': [SA, PR, CO],
  'analytics:teacher': [SA, PR],
  'analytics:self': [TE],

  // Wellbeing (non-clinical)
  'wellbeing:log': [CO, TE],
  'wellbeing:mood:checkin': [ST],
  'wellbeing:view:cases': [CO, PR],
  'wellbeing:view:own': [ST],

  // Career (Grade 9+ only — enforced at component + API level)
  'career:take-assessment': [ST],
  'career:view-results': [ST, CO, GU],
  'career:counselor-view': [CO, PR],

  // LMS
  'lms:create-assignment': [TE, PR],
  'lms:submit-assignment': [ST],
  'lms:grade-assignment': [TE, PR],
  'lms:start-live-class': [TE],
  'lms:join-live-class': [ST, TE, PR],
  'lms:whiteboard': [TE, ST],

  // System Admin only
  'system:manage-schools': [SA],
  'system:manage-users': [SA],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = PERMISSIONS[permission] as readonly Role[]
  return allowed.includes(role)
}

export function getUserPermissions(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => hasPermission(role, p))
}
