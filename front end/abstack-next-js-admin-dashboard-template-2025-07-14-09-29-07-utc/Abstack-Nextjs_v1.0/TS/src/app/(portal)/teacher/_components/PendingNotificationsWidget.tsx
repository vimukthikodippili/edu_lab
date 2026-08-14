'use client'
import Link from 'next/link'
import { BellRing, ChevronRight } from 'lucide-react'
import { useMyStaff } from '@/features/staff/hooks/useMyStaff'
import { useUnreadCount } from '@/features/notifications/hooks/useUnreadCount'

export default function PendingNotificationsWidget() {
  const { data: myStaff } = useMyStaff()
  const { data } = useUnreadCount(myStaff?.id ?? null)
  const count = data?.count ?? 0

  if (count === 0) return null

  return (
    <div
      className="card border-0 shadow-sm rounded-4 mb-4"
      style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid #fed7aa' }}
    >
      <div className="card-body p-4 d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 44, height: 44, background: '#fdba74' }}
          >
            <BellRing size={20} color="#7c2d12" />
          </div>
          <div>
            <div className="fw-bold" style={{ color: '#7c2d12' }}>
              You have {count} exam notification{count !== 1 ? 's' : ''} pending
            </div>
            <div className="small" style={{ color: '#9a3412' }}>
              An assessment was scheduled for one of your classes — check the topic breakdown before marks entry.
            </div>
          </div>
        </div>
        <Link href="/teacher/marks" className="btn btn-sm fw-semibold d-flex align-items-center gap-1" style={{ background: '#ea580c', color: 'white' }}>
          Review <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}
