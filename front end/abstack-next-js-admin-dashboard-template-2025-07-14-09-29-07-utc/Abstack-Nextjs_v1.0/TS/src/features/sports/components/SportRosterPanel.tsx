'use client'
import { useState } from 'react'
import { UserPlus, UserMinus, Search } from 'lucide-react'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useSportRoster } from '../hooks/useSportRoster'
import { useEnrollStudent } from '../hooks/useEnrollStudent'
import { useRemoveFromRoster } from '../hooks/useRemoveFromRoster'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

export default function SportRosterPanel({ sportId }: { sportId: string }) {
  const { showNotification } = useNotificationContext()
  const [search, setSearch] = useState('')
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)

  const { data, isLoading } = useSportRoster(sportId)
  const roster = data?.roster ?? []

  const { data: studentResults } = useStudents({ search, limit: 8, status: 'active' })
  const enrolledIds = new Set(roster.map((r) => r.studentId))
  const searchResults = (studentResults?.data ?? []).filter((s) => !enrolledIds.has(s.id))

  const enrollMutation = useEnrollStudent(sportId)
  const removeMutation = useRemoveFromRoster(sportId)

  const handleEnroll = (studentId: string) => {
    enrollMutation.mutate(studentId, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Student enrolled.' })
        setSearch('')
      },
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  const handleRemove = (studentId: string) => {
    removeMutation.mutate(studentId, {
      onSuccess: () => {
        showNotification({ variant: 'success', message: 'Student removed from roster.' })
        setPendingRemove(null)
      },
      onError: (err) => {
        showNotification({ variant: 'danger', message: extractErrorMessage(err) })
        setPendingRemove(null)
      },
    })
  }

  return (
    <div className="border-top pt-3 mt-2">
      <div className="position-relative mb-3" style={{ maxWidth: 360 }}>
        <Search size={14} className="text-muted position-absolute" style={{ top: 9, left: 10 }} />
        <input
          type="text"
          className="form-control form-control-sm ps-4"
          placeholder="Search students to enroll…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim().length > 0 && (
          <div
            className="border rounded-2 shadow-sm bg-white mt-1 position-absolute w-100"
            style={{ zIndex: 5, maxHeight: 220, overflowY: 'auto' }}
          >
            {searchResults.length === 0 && (
              <div className="px-3 py-2 small text-muted">No matching active students found.</div>
            )}
            {searchResults.map((s) => (
              <button
                key={s.id}
                type="button"
                className="dropdown-item d-flex align-items-center justify-content-between px-3 py-2 small"
                disabled={enrollMutation.isPending}
                onClick={() => handleEnroll(s.id)}
              >
                <span>
                  {s.firstName} {s.lastName}{' '}
                  <span className="text-muted">({s.admissionNumber})</span>
                </span>
                <UserPlus size={14} className="text-success" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="placeholder-glow">
          <div className="placeholder col-12 rounded" style={{ height: 32 }} />
        </div>
      ) : roster.length === 0 ? (
        <p className="text-muted small mb-0">No students enrolled yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="small text-muted">
                <th>Admission #</th>
                <th>Student</th>
                <th>Enrolled</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.studentId}>
                  <td className="small">{r.admissionNumber}</td>
                  <td className="small">{r.firstName} {r.lastName}</td>
                  <td className="small text-muted">{new Date(r.enrolledAt).toLocaleDateString()}</td>
                  <td className="text-end">
                    {pendingRemove === r.studentId ? (
                      <span className="d-inline-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={removeMutation.isPending}
                          onClick={() => handleRemove(r.studentId)}
                        >
                          {removeMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          disabled={removeMutation.isPending}
                          onClick={() => setPendingRemove(null)}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-1 text-danger"
                        title="Remove from roster"
                        onClick={() => setPendingRemove(r.studentId)}
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
