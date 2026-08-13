'use client'
import Link from 'next/link'
import { CheckCircle, AlertTriangle, ClipboardList, CalendarClock, NotebookPen, RefreshCw, Coffee } from 'lucide-react'
import { useFreePeriodStatus } from '@/features/teacher-tasks/hooks/useFreePeriodStatus'

function SkeletonWidget() {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body py-3 placeholder-glow">
        <div className="placeholder col-4 mb-2 rounded" style={{ height: 20 }} />
        <div className="placeholder col-12 rounded" style={{ height: 60 }} />
      </div>
    </div>
  )
}

export default function FreePeriodWidget() {
  const { data: status, isLoading, isFetching, refetch } = useFreePeriodStatus()

  if (isLoading) return <SkeletonWidget />
  if (!status) return null

  if (!status.isFreePeriod) {
    if (!status.currentPeriod) return null
    return (
      <p className="text-muted small mb-4">
        Currently in Period {status.currentPeriod} — no free-period alerts.
      </p>
    )
  }

  const { tasks } = status
  const totalTasks =
    (tasks?.ungradedMarks.length ?? 0) +
    (tasks?.behindScheduleLessons.length ?? 0) +
    (tasks?.missingDiaryEntries.length ?? 0)

  return (
    <div className={`card border-0 shadow-sm mb-4 ${totalTasks > 0 ? 'border-start border-warning border-4' : ''}`}>
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
            >
              <Coffee size={18} className="text-white" />
            </div>
            <div>
              <span className="fw-semibold small d-block">Free Period {status.currentPeriod ? `— Period ${status.currentPeriod}` : ''}</span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Pending work you can catch up on now</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <span className="spinner-border spinner-border-sm" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {totalTasks === 0 ? (
          <p className="text-success small mb-0 fw-semibold d-flex align-items-center gap-2">
            <CheckCircle size={16} />
            You&rsquo;re all caught up!
          </p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {!!tasks?.ungradedMarks.length && (
              <div>
                <span className="text-muted small fw-semibold d-flex align-items-center gap-1 mb-1">
                  <ClipboardList size={13} />
                  Ungraded Marks
                </span>
                <ul className="list-unstyled mb-0 ps-3">
                  {tasks.ungradedMarks.map((t) => (
                    <li key={t.assessmentId} className="small mb-1">
                      <Link href="/teacher/marks" className="text-decoration-none">
                        {t.assessmentTitle} · {t.subjectName} / {t.classSectionName}
                      </Link>
                      <span className="badge bg-warning bg-opacity-15 text-warning-emphasis ms-2">
                        {t.draftMarkCount} draft
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!tasks?.behindScheduleLessons.length && (
              <div>
                <span className="text-muted small fw-semibold d-flex align-items-center gap-1 mb-1">
                  <CalendarClock size={13} />
                  Behind-Schedule Lessons
                </span>
                <ul className="list-unstyled mb-0 ps-3">
                  {tasks.behindScheduleLessons.map((t) => (
                    <li key={t.syllabusUnitId} className="small mb-1">
                      <Link href="/teacher/syllabus/lesson-plan" className="text-decoration-none">
                        {t.title} · {t.subjectName} / {t.gradeName}
                      </Link>
                      <span className="badge bg-warning bg-opacity-15 text-warning-emphasis ms-2 d-inline-flex align-items-center gap-1">
                        <AlertTriangle size={11} />
                        was due {new Date(`${t.plannedCompletionDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!tasks?.missingDiaryEntries.length && (
              <div>
                <span className="text-muted small fw-semibold d-flex align-items-center gap-1 mb-1">
                  <NotebookPen size={13} />
                  Missing Diary Entries
                </span>
                <ul className="list-unstyled mb-0 ps-3">
                  {tasks.missingDiaryEntries.map((t) => (
                    <li key={t.timetableEntryId} className="small mb-1">
                      <Link href="/teacher/class-diary" className="text-decoration-none">
                        Period {t.period} · {t.subjectName} / {t.classSectionName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
