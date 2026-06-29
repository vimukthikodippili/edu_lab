import { MenuItemType } from '@/types/menu'
import { ROLES } from '@/lib/auth/roles'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Calendar,
  CalendarDays,
  BarChart2,
  FileText,
  Settings,
  ShieldCheck,
  QrCode,
  Library,
  CreditCard,
  Heart,
  BrainCircuit,
  Bell,
  UserCheck,
} from 'lucide-react'

export const MENU_ITEMS: MenuItemType[] = [

  // ─── System Admin ─────────────────────────────────────────────────────────

  {
    key: 'admin-nav',
    label: 'Administration',
    isTitle: true,
    allowedRoles: [ROLES.SYSTEM_ADMIN],
  },
  {
    key: 'admin-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/admin',
    allowedRoles: [ROLES.SYSTEM_ADMIN],
  },
  {
    key: 'students',
    label: 'Students',
    icon: GraduationCap,
    allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER],
    children: [
      {
        key: 'students-list',
        label: 'All Students',
        url: '/admin/students',
        parentKey: 'students',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD, ROLES.TEACHER],
      },
      {
        key: 'students-enroll',
        label: 'Enroll Student',
        url: '/admin/students/enroll',
        parentKey: 'students',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
    ],
  },

  // ─── Academic Setup ───────────────────────────────────────────────────────

  {
    key: 'academic-setup',
    label: 'Academic Setup',
    icon: BookOpen,
    allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
    children: [
      {
        key: 'subjects',
        label: 'Subjects',
        url: '/admin/subjects',
        parentKey: 'academic-setup',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
      {
        key: 'al-streams',
        label: 'A/L Streams',
        url: '/admin/academic/streams',
        parentKey: 'academic-setup',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
      {
        key: 'school-calendar-config',
        label: 'School Calendar',
        url: '/admin/academic/calendar-config',
        parentKey: 'academic-setup',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
      {
        key: 'timetable-requirements',
        label: 'Period Requirements',
        url: '/admin/academic/timetable-setup/requirements',
        parentKey: 'academic-setup',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD],
      },
      {
        key: 'timetable-generator',
        label: 'Timetable Generator',
        url: '/admin/academic/timetable-setup',
        parentKey: 'academic-setup',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
    ],
  },

  // ─── Staff ────────────────────────────────────────────────────────────────

  {
    key: 'staff',
    label: 'Staff',
    icon: UserCheck,
    allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD],
    children: [
      {
        key: 'staff-directory',
        label: 'Staff Directory',
        url: '/admin/staff',
        parentKey: 'staff',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.SECTION_HEAD],
      },
      {
        key: 'staff-register',
        label: 'Register Staff',
        url: '/admin/staff/register',
        parentKey: 'staff',
        allowedRoles: [ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL],
      },
    ],
  },

  // ─── Principal ────────────────────────────────────────────────────────────

  {
    key: 'principal-nav',
    label: 'Principal',
    isTitle: true,
    allowedRoles: [ROLES.PRINCIPAL],
  },
  {
    key: 'principal-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/principal',
    allowedRoles: [ROLES.PRINCIPAL],
  },
  {
    key: 'principal-students',
    label: 'Students',
    icon: GraduationCap,
    url: '/admin/students',
    allowedRoles: [ROLES.PRINCIPAL],
  },
  {
    key: 'principal-approvals',
    label: 'Approvals',
    icon: UserCheck,
    url: '/principal/approvals',
    allowedRoles: [ROLES.PRINCIPAL],
    isDisabled: true,
  },

  // ─── Section Head ─────────────────────────────────────────────────────────

  {
    key: 'sectionhead-nav',
    label: 'Section Head',
    isTitle: true,
    allowedRoles: [ROLES.SECTION_HEAD],
  },
  {
    key: 'sectionhead-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/section-head',
    allowedRoles: [ROLES.SECTION_HEAD],
  },
  {
    key: 'sectionhead-students',
    label: 'My Students',
    icon: GraduationCap,
    url: '/admin/students',
    allowedRoles: [ROLES.SECTION_HEAD],
  },

  // ─── Teacher ──────────────────────────────────────────────────────────────

  {
    key: 'teacher-nav',
    label: 'Teacher',
    isTitle: true,
    allowedRoles: [ROLES.TEACHER],
  },
  {
    key: 'teacher-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/teacher',
    allowedRoles: [ROLES.TEACHER],
  },
  {
    key: 'teacher-attendance',
    label: 'Attendance',
    icon: ClipboardList,
    url: '/teacher/attendance',
    allowedRoles: [ROLES.TEACHER],
    isDisabled: true,
  },
  {
    key: 'teacher-marks',
    label: 'Marks Entry',
    icon: FileText,
    url: '/teacher/marks',
    allowedRoles: [ROLES.TEACHER],
    isDisabled: true,
  },
  {
    key: 'teacher-timetable',
    label: 'Timetable',
    icon: Calendar,
    url: '/teacher/timetable',
    allowedRoles: [ROLES.TEACHER],
  },

  // ─── Student ──────────────────────────────────────────────────────────────

  {
    key: 'student-nav',
    label: 'Student Portal',
    isTitle: true,
    allowedRoles: [ROLES.STUDENT],
  },
  {
    key: 'student-dashboard',
    label: 'My Dashboard',
    icon: LayoutDashboard,
    url: '/student',
    allowedRoles: [ROLES.STUDENT],
  },
  {
    key: 'student-grades',
    label: 'My Grades',
    icon: BarChart2,
    url: '/student/grades',
    allowedRoles: [ROLES.STUDENT],
    isDisabled: true,
  },
  {
    key: 'student-timetable',
    label: 'Timetable',
    icon: Calendar,
    url: '/student/timetable',
    allowedRoles: [ROLES.STUDENT],
    isDisabled: true,
  },

  // ─── Guardian ─────────────────────────────────────────────────────────────

  {
    key: 'guardian-nav',
    label: 'Parent / Guardian',
    isTitle: true,
    allowedRoles: [ROLES.GUARDIAN],
  },
  {
    key: 'guardian-dashboard',
    label: 'My Dashboard',
    icon: LayoutDashboard,
    url: '/guardian',
    allowedRoles: [ROLES.GUARDIAN],
  },
  {
    key: 'guardian-children',
    label: 'My Children',
    icon: GraduationCap,
    url: '/guardian/children',
    allowedRoles: [ROLES.GUARDIAN],
    isDisabled: true,
  },

  // ─── Counselor ────────────────────────────────────────────────────────────

  {
    key: 'counselor-nav',
    label: 'Counselor',
    isTitle: true,
    allowedRoles: [ROLES.COUNSELOR],
  },
  {
    key: 'counselor-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    url: '/counselor',
    allowedRoles: [ROLES.COUNSELOR],
  },
  {
    key: 'counselor-wellbeing',
    label: 'Wellbeing Logs',
    icon: Heart,
    url: '/counselor/wellbeing',
    allowedRoles: [ROLES.COUNSELOR],
    isDisabled: true,
  },
  {
    key: 'counselor-career',
    label: 'Career Guidance',
    icon: BrainCircuit,
    url: '/counselor/career',
    allowedRoles: [ROLES.COUNSELOR],
    isDisabled: true,
  },

  // ─── Security Officer ─────────────────────────────────────────────────────

  {
    key: 'security-nav',
    label: 'Gate Security',
    isTitle: true,
    allowedRoles: [ROLES.SECURITY_OFFICER],
  },
  {
    key: 'security-dashboard',
    label: 'Dashboard',
    icon: ShieldCheck,
    url: '/security',
    allowedRoles: [ROLES.SECURITY_OFFICER],
  },
  {
    key: 'security-scan',
    label: 'QR Verification',
    icon: QrCode,
    url: '/security/scan',
    allowedRoles: [ROLES.SECURITY_OFFICER],
    isDisabled: true,
  },

  // ─── Librarian ────────────────────────────────────────────────────────────

  {
    key: 'library-nav',
    label: 'Library',
    isTitle: true,
    allowedRoles: [ROLES.LIBRARIAN],
  },
  {
    key: 'library-dashboard',
    label: 'Dashboard',
    icon: Library,
    url: '/library',
    allowedRoles: [ROLES.LIBRARIAN],
  },
  {
    key: 'library-books',
    label: 'Books Catalogue',
    icon: BookOpen,
    url: '/library/books',
    allowedRoles: [ROLES.LIBRARIAN],
    isDisabled: true,
  },
  {
    key: 'library-issuance',
    label: 'Issue / Return',
    icon: ClipboardList,
    url: '/library/issuance',
    allowedRoles: [ROLES.LIBRARIAN],
    isDisabled: true,
  },

  // ─── Accountant ───────────────────────────────────────────────────────────

  {
    key: 'accounts-nav',
    label: 'Finance',
    isTitle: true,
    allowedRoles: [ROLES.ACCOUNTANT],
  },
  {
    key: 'accounts-dashboard',
    label: 'Dashboard',
    icon: CreditCard,
    url: '/accounts',
    allowedRoles: [ROLES.ACCOUNTANT],
  },
  {
    key: 'accounts-fees',
    label: 'Fee Structure',
    icon: FileText,
    url: '/accounts/fees',
    allowedRoles: [ROLES.ACCOUNTANT],
    isDisabled: true,
  },
  {
    key: 'accounts-payments',
    label: 'Payments',
    icon: CreditCard,
    url: '/accounts/payments',
    allowedRoles: [ROLES.ACCOUNTANT],
    isDisabled: true,
  },

]

// Horizontal layout uses the same items
export const HORIZONTAL_MENU_ITEM: MenuItemType[] = MENU_ITEMS
