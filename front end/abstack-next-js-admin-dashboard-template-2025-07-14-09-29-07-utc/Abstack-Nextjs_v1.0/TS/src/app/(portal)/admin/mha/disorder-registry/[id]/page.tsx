'use client'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Brain, ShieldAlert } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useDisorderRegistryDetail } from '@/features/disorder-registry/hooks/useDisorderRegistryDetail'
import { DISORDER_SECTION_LABELS, RISK_CATEGORY_LABELS } from '@/types/sims/disorder-registry'

interface PageProps {
  params: Promise<{ id: string }>
}

function DisorderRegistryDetailPage({ id }: { id: string }) {
  const { data: domain, isLoading, isError } = useDisorderRegistryDetail(id)

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 720 }}>
      <Link href="/admin/mha/disorder-registry" className="d-inline-flex align-items-center gap-1 text-muted small text-decoration-none mb-3">
        <ArrowLeft size={14} />
        Back to Disorder / Test Registry
      </Link>

      {isLoading && (
        <div className="placeholder-glow">
          <div className="placeholder col-6 mb-2 rounded" style={{ height: 32 }} />
          <div className="placeholder col-12 mb-2 rounded" style={{ height: 120 }} />
        </div>
      )}

      {isError && <div className="text-center text-muted py-5">Domain not found.</div>}

      {!isLoading && !isError && domain && (
        <>
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
                {domain.name}
                {domain.safetyFlag && <ShieldAlert size={16} className="text-danger" aria-label="Safety-flag domain" />}
              </h4>
              <p className="text-muted small mb-0">{domain.code}</p>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-4 text-muted fw-normal">Section</dt>
                <dd className="col-8">{DISORDER_SECTION_LABELS[domain.section]}</dd>
                <dt className="col-4 text-muted fw-normal">Risk Category</dt>
                <dd className="col-8">
                  <span className="badge bg-secondary bg-opacity-15 text-secondary">
                    {RISK_CATEGORY_LABELS[domain.riskCategory]}
                  </span>
                </dd>
                <dt className="col-4 text-muted fw-normal">Age Range</dt>
                <dd className="col-8">{domain.ageMin}–{domain.ageMax}</dd>
                <dt className="col-4 text-muted fw-normal">Status</dt>
                <dd className="col-8 mb-0">
                  <span className={`badge ${domain.isActive ? 'bg-success bg-opacity-15 text-success' : 'bg-secondary bg-opacity-15 text-secondary'}`}>
                    {domain.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </dl>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-transparent border-bottom fw-semibold py-3">Symptoms</div>
            <div className="card-body">
              {domain.symptoms.length === 0 ? (
                <p className="text-muted small mb-0">No symptoms listed.</p>
              ) : (
                <ul className="mb-0 small">
                  {domain.symptoms.map((s) => <li key={s}>{s}</li>)}
                </ul>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold py-3">Reference Tests</div>
            <div className="card-body">
              {domain.tests.length === 0 ? (
                <p className="text-muted small mb-0">No reference tests listed.</p>
              ) : (
                <ul className="mb-0 small">
                  {domain.tests.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminDisorderRegistryDetailPage({ params }: PageProps) {
  const { id } = use(params)
  return (
    <RoleGuard
      allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}
    >
      <DisorderRegistryDetailPage id={id} />
    </RoleGuard>
  )
}
