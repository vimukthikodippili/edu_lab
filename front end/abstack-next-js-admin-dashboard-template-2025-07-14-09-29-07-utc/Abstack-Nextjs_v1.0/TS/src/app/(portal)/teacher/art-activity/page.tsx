'use client'
import { useEffect, useState } from 'react'
import { Palette, CheckCircle2, Plus } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useMyClassTeacherSections } from '@/features/teacher-subject-requirements/hooks/useMyClassTeacherSections'
import { useArtActivities } from '@/features/art-activities/hooks/useArtActivities'
import { useCreateArtActivity } from '@/features/art-activities/hooks/useCreateArtActivity'
import { useArtActivityRoster } from '@/features/art-activities/hooks/useArtActivityRoster'
import { useBulkPreCheck } from '@/features/art-activities/hooks/useBulkPreCheck'
import { useBulkPostCheck } from '@/features/art-activities/hooks/useBulkPostCheck'
import { ART_PALETTE_COLORS } from '@/types/sims/art-activity'

const TODAY = new Date().toISOString().slice(0, 10)

type ApiError = { response?: { data?: { message?: string } } }
function extractErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.message ?? fallback
}

function ColorCheckPanels({ activityId }: { activityId: string }) {
  const { showNotification } = useNotificationContext()
  const { data: roster, isLoading, dataUpdatedAt } = useArtActivityRoster(activityId)
  const bulkPreCheck = useBulkPreCheck()
  const bulkPostCheck = useBulkPostCheck()

  const [preLocal, setPreLocal] = useState<Record<string, boolean>>({})
  const [postLocal, setPostLocal] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!roster) return
    const pre: Record<string, boolean> = {}
    const post: Record<string, string[]> = {}
    roster.roster.forEach((r) => {
      pre[r.studentId] = r.hasAllColors ?? true
      post[r.studentId] = r.colorsUsed ?? []
    })
    setPreLocal(pre)
    setPostLocal(post)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt])

  if (isLoading || !roster) {
    return <div className="text-muted small">Loading roster…</div>
  }

  const handleMarkAllReady = () => {
    const map: Record<string, boolean> = {}
    roster.roster.forEach((r) => { map[r.studentId] = true })
    setPreLocal(map)
  }

  const handleSavePreCheck = () => {
    bulkPreCheck.mutate(
      {
        activityId,
        entries: roster.roster.map((r) => ({ studentId: r.studentId, hasAllColors: preLocal[r.studentId] ?? true })),
      },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Color check saved.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not save the color check.') }),
      },
    )
  }

  const toggleColorUsed = (studentId: string, color: string) => {
    setPostLocal((prev) => {
      const current = prev[studentId] ?? []
      const next = current.includes(color) ? current.filter((c) => c !== color) : [...current, color]
      return { ...prev, [studentId]: next }
    })
  }

  const handleSavePostCheck = () => {
    bulkPostCheck.mutate(
      {
        activityId,
        entries: roster.roster.map((r) => ({ studentId: r.studentId, colorsUsed: postLocal[r.studentId] ?? [] })),
      },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Colors used saved.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not save colors used.') }),
      },
    )
  }

  return (
    <>
      {/* Before Drawing */}
      <div className="card border-0 shadow-sm mb-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <Palette size={16} />
            Before Drawing — {roster.preCheckConfirmedCount} / {roster.totalStudents} have all colors
          </span>
        </div>
        <div className="card-body">
          <div className="d-flex gap-2 mb-3">
            <button type="button" className="btn btn-sm btn-outline-success" onClick={handleMarkAllReady}>
              Mark all ready
            </button>
          </div>
          <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th className="small text-muted">Student</th>
                  <th className="small text-muted text-center" style={{ width: 140 }}>Has all colors?</th>
                </tr>
              </thead>
              <tbody>
                {roster.roster.map((r) => (
                  <tr key={r.studentId}>
                    <td className="small">{r.lastName}, {r.firstName} <span className="text-muted">({r.admissionNumber})</span></td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={preLocal[r.studentId] ?? true}
                        onChange={(e) => setPreLocal((prev) => ({ ...prev, [r.studentId]: e.target.checked }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold mt-3"
            style={{ background: 'var(--edulab-accent)', border: 'none' }}
            disabled={bulkPreCheck.isPending}
            onClick={handleSavePreCheck}
          >
            {bulkPreCheck.isPending ? 'Saving…' : 'Save Color Check'}
          </button>
        </div>
      </div>

      {/* After Drawing */}
      <div className="card border-0 shadow-sm mb-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <CheckCircle2 size={16} />
            After Drawing — Colors Used
          </span>
        </div>
        <div className="card-body">
          <div className="d-flex flex-column gap-3">
            {roster.roster.map((r) => (
              <div key={r.studentId} className="border rounded-3 px-3 py-2">
                <div className="small fw-semibold mb-2">
                  {r.lastName}, {r.firstName} <span className="text-muted fw-normal">({r.admissionNumber})</span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {ART_PALETTE_COLORS.map((color) => {
                    const selected = (postLocal[r.studentId] ?? []).includes(color)
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 ${selected ? 'text-white' : 'btn-outline-secondary'}`}
                        style={selected ? { background: color === 'white' ? '#94a3b8' : color, border: 'none' } : undefined}
                        onClick={() => toggleColorUsed(r.studentId, color)}
                      >
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold mt-3"
            style={{ background: 'var(--edulab-accent)', border: 'none' }}
            disabled={bulkPostCheck.isPending}
            onClick={handleSavePostCheck}
          >
            {bulkPostCheck.isPending ? 'Saving…' : 'Save Colors Used'}
          </button>
        </div>
      </div>
    </>
  )
}

function ArtActivityContent() {
  const { showNotification } = useNotificationContext()
  const { data: sections, isLoading: sectionsLoading } = useMyClassTeacherSections()
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [activityDate, setActivityDate] = useState(TODAY)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const activeSectionId = selectedSectionId ?? sections?.[0]?.id ?? null
  const { data: activities, isLoading: activitiesLoading } = useArtActivities(activeSectionId)
  const createActivity = useCreateArtActivity()

  const activityForDate = activities?.find((a) => a.activityDate === activityDate) ?? null
  const activeActivityId = selectedActivityId ?? activityForDate?.id ?? null

  const handleStartActivity = () => {
    if (!activeSectionId) return
    createActivity.mutate(
      { classSectionId: activeSectionId, activityDate, title: 'Painting Activity' },
      {
        onSuccess: (activity) => {
          setSelectedActivityId(activity.id)
          showNotification({ variant: 'success', message: 'Activity started.' })
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not start the activity.') }),
      },
    )
  }

  if (sectionsLoading) {
    return <div className="text-muted">Loading…</div>
  }

  if (!sections?.length) {
    return (
      <div className="text-center text-muted py-5">
        <Palette size={32} className="mb-2 opacity-50" />
        <p className="mb-0">You are not currently assigned as a class teacher for any section.</p>
      </div>
    )
  }

  return (
    <>
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            {sections.length > 1 && (
              <div className="col-auto">
                <label className="form-label small fw-semibold mb-1">Class Section</label>
                <select
                  className="form-select form-select-sm"
                  value={activeSectionId ?? ''}
                  onChange={(e) => { setSelectedSectionId(Number(e.target.value)); setSelectedActivityId(null) }}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.grade.name} · Section {s.name} ({s.academicYear})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-auto">
              <label className="form-label small fw-semibold mb-1">Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={activityDate}
                onChange={(e) => { setActivityDate(e.target.value); setSelectedActivityId(null) }}
              />
            </div>
            {!activityForDate && !activitiesLoading && (
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-sm text-white fw-semibold d-flex align-items-center gap-2"
                  style={{ background: 'var(--edulab-accent)', border: 'none' }}
                  disabled={createActivity.isPending}
                  onClick={handleStartActivity}
                >
                  <Plus size={14} /> {createActivity.isPending ? 'Starting…' : 'Start New Activity'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeActivityId ? (
        <ColorCheckPanels activityId={activeActivityId} />
      ) : (
        <div className="text-center text-muted py-5">
          <p className="mb-0">No painting activity recorded for this date yet — click "Start New Activity" above.</p>
        </div>
      )}
    </>
  )
}

export default function ArtActivityPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.TEACHER]}>
      <div className="container-fluid py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <Palette size={24} className="text-primary" />
          <div>
            <h4 className="mb-0">Art &amp; Painting — Color Check</h4>
            <p className="text-muted small mb-0">
              Before drawing, confirm every student has all their colors. After drawing, record which colors each student used.
            </p>
          </div>
        </div>
        <ArtActivityContent />
      </div>
    </RoleGuard>
  )
}
