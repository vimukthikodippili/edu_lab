'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardPlus, ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react'
import { StudentPicker } from '@/features/wellbeing/components/StudentPicker'
import { AcademicContextPanel } from '@/features/academic-context/components/AcademicContextPanel'
import { useMhaConsentStatus } from '@/features/mha-consent/hooks/useMhaConsentStatus'
import { useMhaSessionPreview } from '../hooks/useMhaSessionPreview'
import { useCreateMhaSession } from '../hooks/useCreateMhaSession'
import { useNotificationContext } from '@/context/useNotificationContext'
import { DISORDER_SECTION_LABELS, type DisorderRegistryEntry, type DisorderSection } from '@/types/sims/disorder-registry'
import type { MhaSessionRecord } from '@/types/sims/mha-session'

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function groupBySection(domains: DisorderRegistryEntry[]): [DisorderSection, DisorderRegistryEntry[]][] {
  const groups = new Map<DisorderSection, DisorderRegistryEntry[]>()
  for (const domain of domains) {
    const list = groups.get(domain.section) ?? []
    list.push(domain)
    groups.set(domain.section, list)
  }
  return Array.from(groups.entries())
}

function CreatedSessionCard({ session, domains }: { session: MhaSessionRecord; domains: DisorderRegistryEntry[] }) {
  return (
    <div className="card border-0 shadow-sm mt-4">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <ShieldCheck size={20} className="text-success" />
          <h5 className="mb-0 fw-bold">Session Created</h5>
        </div>
        <dl className="row mb-0 small">
          <dt className="col-4 text-muted fw-normal">Case No.</dt>
          <dd className="col-8"><code className="text-primary">{session.caseNumber}</code></dd>
          <dt className="col-4 text-muted fw-normal">Screening Date</dt>
          <dd className="col-8">{session.screeningDate}</dd>
          <dt className="col-4 text-muted fw-normal">Status</dt>
          <dd className="col-8">
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-uppercase">
              {session.status}
            </span>
          </dd>
          <dt className="col-4 text-muted fw-normal">Domains to Assess</dt>
          <dd className="col-8 mb-0">{domains.length}</dd>
        </dl>
        <div className="mt-3">
          <Link href={`/counselor/mha-sessions/${session.id}`} className="btn btn-sm text-white fw-semibold d-inline-flex align-items-center gap-1" style={{ background: '#4f46e5', border: 'none' }}>
            Continue to Intake <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function NewMhaSessionContent() {
  const { showNotification } = useNotificationContext()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [screeningDate, setScreeningDate] = useState(todayIso())
  const [created, setCreated] = useState<{ session: MhaSessionRecord; domains: DisorderRegistryEntry[] } | null>(null)

  const { data: consentStatus, isLoading: consentLoading } = useMhaConsentStatus(studentId ?? '')
  const { data: preview, isLoading: previewLoading } = useMhaSessionPreview(studentId, screeningDate)
  const createMutation = useCreateMhaSession()

  const hasConsent = !!consentStatus?.current
  const grouped = useMemo(() => groupBySection(preview?.domains ?? []), [preview])

  const handleSelectStudent = (id: string, name: string) => {
    setStudentId(id)
    setStudentName(name)
    setCreated(null)
  }

  const handleCreate = () => {
    if (!studentId) return
    createMutation.mutate(
      { studentId, screeningDate },
      {
        onSuccess: (result) => {
          showNotification({ variant: 'success', message: `Session ${result.session.caseNumber} created.` })
          setCreated({ session: result.session, domains: result.domains })
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
      },
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1180 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <ClipboardPlus size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">New MHA Screening Session</h4>
          <p className="text-muted small mb-0">
            Select a student — domains are automatically filtered to their current age and consent is required before starting.
          </p>
        </div>
      </div>

      <StudentPicker selectedId={studentId} onSelect={handleSelectStudent} />

      {studentId && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <div className="row g-3 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small mb-1">Student</label>
                    <input type="text" className="form-control form-control-sm" value={studentName} disabled />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small mb-1">Screening Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={screeningDate}
                      max={todayIso()}
                      onChange={(e) => { setScreeningDate(e.target.value); setCreated(null) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {!consentLoading && !hasConsent && (
              <div
                className="d-flex align-items-start gap-2 rounded-3 p-3 mb-4"
                style={{ background: '#fff7ed', color: '#c2410c' }}
              >
                <ShieldAlert size={16} className="mt-1 flex-shrink-0" />
                <div className="small">
                  <strong>No guardian consent on file.</strong> A session cannot be started for this
                  student until consent is recorded on their profile (MHA Guardian Consent panel).
                </div>
              </div>
            )}

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-transparent border-bottom fw-semibold py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span className="d-flex align-items-center gap-3">
                  Age-Appropriate Domains
                  <a
                    href="/admin/mha/assessment-matrix"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="small fw-normal text-decoration-none"
                  >
                    View Assessment Matrix ↗
                  </a>
                </span>
                {!previewLoading && preview && (
                  <span className="badge bg-secondary-subtle text-secondary border">
                    Age {preview.studentAge} · {preview.domains.length} domain{preview.domains.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="card-body">
                {previewLoading ? (
                  <div className="text-muted small">Loading domains…</div>
                ) : grouped.length === 0 ? (
                  <div className="text-muted small">No active domains apply to this student's current age.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {grouped.map(([section, domains]) => (
                      <div key={section}>
                        <div className="fw-semibold small mb-2">{DISORDER_SECTION_LABELS[section]}</div>
                        <div className="d-flex flex-wrap gap-2">
                          {domains.map((d) => (
                            <span key={d.id} className="badge bg-light text-dark border" style={{ fontSize: 12 }}>
                              {d.name}
                              {d.safetyFlag && <ShieldAlert size={11} className="text-danger ms-1" />}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn text-white fw-semibold px-4"
                style={{ background: '#4f46e5', border: 'none' }}
                disabled={!hasConsent || consentLoading || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Create Draft Session'}
              </button>
            </div>

            {created && <CreatedSessionCard session={created.session} domains={created.domains} />}
          </div>

          <div className="col-lg-4">
            <AcademicContextPanel studentId={studentId} />
          </div>
        </div>
      )}
    </div>
  )
}
