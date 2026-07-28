'use client'
import { CalendarDays, Users2 } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { usePublishedEvents } from '@/features/events/hooks/usePublishedEvents'
import { useMyClassTeacherSections } from '@/features/teacher-subject-requirements/hooks/useMyClassTeacherSections'
import { useClassBulkCheckIn } from '@/features/events/hooks/useClassBulkCheckIn'
import { useNotificationContext } from '@/context/useNotificationContext'

function TeacherEventsContent() {
  const { data: events, isLoading: eventsLoading } = usePublishedEvents()
  const { data: sections, isLoading: sectionsLoading } = useMyClassTeacherSections()
  const bulkCheckIn = useClassBulkCheckIn()
  const { showNotification } = useNotificationContext()

  const publishedEvents = events?.filter((e) => e.status === 'published') ?? []

  const handleBulkCheckIn = (eventId: string, eventName: string, classSectionId: number, className: string) => {
    bulkCheckIn.mutate(
      { eventId, classSectionId },
      {
        onSuccess: (result) =>
          showNotification({
            variant: 'success',
            message: result.checkedInCount > 0
              ? `Checked in ${result.checkedInCount} student(s) from ${className} for ${eventName}.`
              : `${className} was already fully checked in for ${eventName}.`,
          }),
        onError: (err: any) => showNotification({ variant: 'danger', message: err?.response?.data?.message ?? 'Could not bulk-check-in your class.' }),
      },
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <CalendarDays size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">School Events</h4>
          <p className="text-muted small mb-0">Bulk-check-in your class for events your students are participating in.</p>
        </div>
      </div>

      {!sectionsLoading && !sections?.length && (
        <div className="alert alert-info small">You are not currently the class teacher of any section.</div>
      )}

      {eventsLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !publishedEvents.length ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <CalendarDays size={36} className="mb-3 opacity-25" />
            <p className="mb-0">No upcoming events right now.</p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {publishedEvents.map((event) => (
            <div key={event.id} className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-1">{event.name}</h6>
                <span className="text-muted small d-block mb-3">{event.date} · {event.venue}</span>
                {sections?.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2 me-2"
                    disabled={bulkCheckIn.isPending}
                    onClick={() => handleBulkCheckIn(event.id, event.name, section.id, `${section.grade.name} ${section.name}`)}
                  >
                    <Users2 size={13} /> Check In {section.grade.name} {section.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherEventsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <TeacherEventsContent />
    </RoleGuard>
  )
}
