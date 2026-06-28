import { clsx } from 'clsx'

type Status = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'present' | 'absent' | 'late' | 'paid' | 'unpaid' | 'overdue'

const STATUS_VARIANTS: Record<Status, string> = {
  active: 'success',
  inactive: 'secondary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  present: 'success',
  absent: 'danger',
  late: 'warning',
  paid: 'success',
  unpaid: 'danger',
  overdue: 'danger',
}

const STATUS_LABELS: Record<Status, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  paid: 'Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={clsx(`badge bg-${STATUS_VARIANTS[status]}`, className)}>
      {STATUS_LABELS[status]}
    </span>
  )
}
