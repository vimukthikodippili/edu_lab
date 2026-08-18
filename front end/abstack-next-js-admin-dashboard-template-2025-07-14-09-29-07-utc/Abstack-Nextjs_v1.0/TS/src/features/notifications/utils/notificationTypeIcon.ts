import {
  Bell,
  GraduationCap,
  Users,
  FlaskConical,
  FileSignature,
  CalendarClock,
  DollarSign,
  MessageSquare,
  BookOpen,
  ShieldAlert,
  PencilLine,
  type LucideIcon,
} from 'lucide-react'

// Notification `type` strings are free-form across dozens of backend modules (exam, PTM, lab
// reports, consent forms, fees, feedback, subject selection, leave, visitors, mark correction,
// ...) — a keyword match on the type buckets them into a scannable icon rather than requiring an
// exhaustive, constantly-drifting exact-match list.
const TYPE_ICON_RULES: Array<{ test: RegExp; icon: LucideIcon; color: string }> = [
  { test: /exam|seat|subject_selection/, icon: GraduationCap, color: '#6366f1' },
  { test: /ptm/, icon: Users, color: '#0891b2' },
  { test: /lab_report|experiment|equipment/, icon: FlaskConical, color: '#059669' },
  { test: /consent/, icon: FileSignature, color: '#d97706' },
  { test: /leave/, icon: CalendarClock, color: '#7c3aed' },
  { test: /fee/, icon: DollarSign, color: '#16a34a' },
  { test: /feedback/, icon: MessageSquare, color: '#db2777' },
  { test: /assignment|syllabus|diary/, icon: BookOpen, color: '#2563eb' },
  { test: /visitor|security/, icon: ShieldAlert, color: '#dc2626' },
  { test: /mark_correction/, icon: PencilLine, color: '#ea580c' },
]
const DEFAULT_TYPE_ICON = { icon: Bell, color: 'var(--edulab-accent)' }

export function iconForNotificationType(type: string): { icon: LucideIcon; color: string } {
  const rule = TYPE_ICON_RULES.find((r) => r.test.test(type))
  return rule ? { icon: rule.icon, color: rule.color } : DEFAULT_TYPE_ICON
}

export function notificationTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
