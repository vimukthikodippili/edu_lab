'use client'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { leaveSchema, type LeaveFormValues } from '@/features/teacher/schemas/leaveSchema'
import { useSubmitLeaveRequest } from '@/features/teacher/hooks/useSubmitLeaveRequest'

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  medical: 'Medical Leave',
  casual: 'Casual Leave',
  no_pay: 'No-Pay Leave',
}

function ApplyLeaveContent() {
  const router = useRouter()
  const { showNotification } = useNotificationContext()
  const mutation = useSubmitLeaveRequest()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: yupResolver(leaveSchema),
    defaultValues: { leaveType: undefined, startDate: '', endDate: '', reason: '' },
  })

  const onSubmit = (data: LeaveFormValues) => {
    mutation.mutate(data, {
      onSuccess: () => {
        showNotification({
          variant: 'success',
          message: 'Leave request submitted. The principal will review it shortly.',
        })
        router.push('/teacher/leave')
      },
      onError: (err: Error & { response?: { data?: { message?: string } } }) => {
        showNotification({
          variant: 'danger',
          message: err?.response?.data?.message ?? 'Failed to submit leave request.',
        })
      },
    })
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 680 }}>
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        {/* Card header */}
        <div
          className="card-header border-0 py-4 px-4 d-flex align-items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <div
            className="rounded-3 d-flex align-items-center justify-content-center"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)' }}
          >
            <CalendarCheck size={22} color="#fff" />
          </div>
          <div>
            <h5 className="mb-0 text-white fw-bold">Apply for Leave</h5>
            <p className="mb-0 small" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Submit a leave request for principal approval
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="card-body p-4">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Leave type */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Leave Type <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${errors.leaveType ? 'is-invalid' : ''}`}
                {...register('leaveType')}
              >
                <option value="">— Select leave type —</option>
                {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.leaveType && (
                <div className="invalid-feedback">{errors.leaveType.message}</div>
              )}
            </div>

            {/* Date range */}
            <div className="row g-3 mb-3">
              <div className="col-sm-6">
                <label className="form-label fw-semibold">
                  Start Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <div className="invalid-feedback">{errors.startDate.message}</div>
                )}
              </div>
              <div className="col-sm-6">
                <label className="form-label fw-semibold">
                  End Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <div className="invalid-feedback">{errors.endDate.message}</div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Reason <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
                placeholder="Describe the reason for your leave (minimum 10 characters)…"
                {...register('reason')}
              />
              {errors.reason && (
                <div className="invalid-feedback">{errors.reason.message}</div>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex gap-3">
              <button
                type="submit"
                className="btn btn-primary px-4 d-flex align-items-center gap-2"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 size={16} className="spin" />}
                {mutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => router.push('/teacher/leave')}
                disabled={mutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function ApplyLeavePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER, ROLES.SECTION_HEAD]}>
      <ApplyLeaveContent />
    </RoleGuard>
  )
}
