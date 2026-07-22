'use client'
import { useState } from 'react'
import { FlaskConical, Wrench, ClipboardList, GraduationCap, AlertTriangle, PackageX } from 'lucide-react'
import { useLabOverviewDashboard } from '@/features/lab-overview/hooks/useLabOverviewDashboard'
import { useLabs } from '@/features/labs/hooks/useLabs'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useClassSections } from '@/features/teacher-subject-requirements/hooks/useClassSections'
import type { LabOverviewFilters } from '@/types/sims/lab-overview'

function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${(rate * 100).toFixed(0)}%`
}

function PanelCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            {icon}
          </div>
          <div>
            <h6 className="mb-0 fw-bold">{title}</h6>
            <p className="text-muted mb-0" style={{ fontSize: '0.72rem' }}>{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <p className="text-muted small mb-0 py-3 text-center">{label}</p>
}

function LabUtilisationPanel({ filters }: { filters: LabOverviewFilters }) {
  const { data, isLoading } = useLabOverviewDashboard(filters)
  const rows = data?.labUtilisation ?? []
  return (
    <PanelCard icon={<FlaskConical size={18} className="text-white" />} title="Lab Utilisation" subtitle="Confirmed bookings vs available slots">
      {isLoading ? (
        <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 120 }} /></div>
      ) : rows.length === 0 ? (
        <EmptyRow label="No labs found." />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th className="border-0 fw-semibold">Lab</th>
                <th className="border-0 fw-semibold text-end">Bookings</th>
                <th className="border-0 fw-semibold text-end">Slots</th>
                <th className="border-0 fw-semibold text-end">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.labId}>
                  <td className="small fw-semibold">{r.labName}</td>
                  <td className="small text-end">{r.confirmedBookings}</td>
                  <td className="small text-end">{r.totalAvailableSlots ?? '—'}</td>
                  <td className="small text-end fw-semibold">{formatPercent(r.utilisationRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

function EquipmentHealthPanel({ filters }: { filters: LabOverviewFilters }) {
  const { data, isLoading } = useLabOverviewDashboard(filters)
  const health = data?.equipmentHealth
  return (
    <PanelCard icon={<Wrench size={18} className="text-white" />} title="Equipment Health" subtitle="Condition, low stock, and damage reports">
      {isLoading || !health ? (
        <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 120 }} /></div>
      ) : (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex gap-2 flex-wrap">
            <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ background: '#dcfce7', color: '#15803d' }}>
              {health.conditionCounts.good} Good
            </span>
            <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ background: '#fef9c3', color: '#92400e' }}>
              {health.conditionCounts.fair} Fair
            </span>
            <span className="badge rounded-pill px-3 py-2 fw-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {health.conditionCounts.poor} Poor
            </span>
          </div>

          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <PackageX size={14} className="text-muted" />
              <span className="fw-semibold small">Low stock ({health.lowStockCount})</span>
            </div>
            {health.lowStockItems.length === 0 ? (
              <p className="text-muted small mb-0">Nothing below minimum stock.</p>
            ) : (
              <div className="d-flex flex-column gap-1">
                {health.lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="d-flex justify-content-between small">
                    <span>{item.name} <span className="text-muted">({item.labName})</span></span>
                    <span className="fw-semibold">{item.quantity}/{item.minStockLevel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-muted" />
              <span className="fw-semibold small">
                Damage reports ({health.damageReportsByType.damaged} damaged, {health.damageReportsByType.missing} missing)
              </span>
            </div>
            {health.recentDamageReports.length === 0 ? (
              <p className="text-muted small mb-0">No damage reports.</p>
            ) : (
              <div className="d-flex flex-column gap-1">
                {health.recentDamageReports.slice(0, 5).map((r) => (
                  <div key={r.id} className="d-flex justify-content-between small">
                    <span>{r.equipmentName} <span className="text-muted">({r.labName})</span></span>
                    <span className="text-capitalize fw-semibold">{r.reportType} ×{r.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PanelCard>
  )
}

function ExperimentCoveragePanel({ filters }: { filters: LabOverviewFilters }) {
  const { data, isLoading } = useLabOverviewDashboard(filters)
  const rows = data?.experimentCoverage ?? []
  return (
    <PanelCard icon={<ClipboardList size={18} className="text-white" />} title="Experiment Coverage" subtitle="Logged experiments per class and lab">
      {isLoading ? (
        <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 120 }} /></div>
      ) : rows.length === 0 ? (
        <EmptyRow label="No experiment logs found." />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th className="border-0 fw-semibold">Class</th>
                <th className="border-0 fw-semibold">Lab</th>
                <th className="border-0 fw-semibold text-end">Experiments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.classSectionId}-${r.labId}`}>
                  <td className="small fw-semibold">{r.className}</td>
                  <td className="small">{r.labName}</td>
                  <td className="small text-end">{r.experimentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

function LabReportPerformancePanel({ filters }: { filters: LabOverviewFilters }) {
  const { data, isLoading } = useLabOverviewDashboard(filters)
  const rows = data?.labReportPerformance ?? []
  return (
    <PanelCard icon={<GraduationCap size={18} className="text-white" />} title="Lab Report Performance" subtitle="Average grade and submission rate">
      {isLoading ? (
        <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 120 }} /></div>
      ) : rows.length === 0 ? (
        <EmptyRow label="No lab report assignments found." />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr className="text-muted small">
                <th className="border-0 fw-semibold">Class</th>
                <th className="border-0 fw-semibold">Subject</th>
                <th className="border-0 fw-semibold text-end">Assignments</th>
                <th className="border-0 fw-semibold text-end">Avg Grade</th>
                <th className="border-0 fw-semibold text-end">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.classSectionId}-${r.subjectId}`}>
                  <td className="small fw-semibold">{r.className}</td>
                  <td className="small">{r.subjectName}</td>
                  <td className="small text-end">{r.assignmentCount}</td>
                  <td className="small text-end">{r.averageGrade === null ? '—' : r.averageGrade.toFixed(2)}</td>
                  <td className="small text-end">{formatPercent(r.submissionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  )
}

export default function LabOverviewContent() {
  const [filters, setFilters] = useState<LabOverviewFilters>({})

  const { data: labs = [], isLoading: labsLoading } = useLabs()
  const { data: subjectsPage, isLoading: subjectsLoading } = useSubjects({ limit: 200 })
  const { data: classSections = [], isLoading: sectionsLoading } = useClassSections()
  const subjects = subjectsPage?.data ?? []

  const updateFilter = <K extends keyof LabOverviewFilters>(key: K, value: LabOverviewFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
        >
          <FlaskConical size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Lab Overview Dashboard</h4>
          <p className="text-muted small mb-0">Utilisation, equipment health, experiment coverage, and report performance across all labs</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label fw-semibold small mb-1">Lab</label>
              <select
                className="form-select form-select-sm"
                disabled={labsLoading}
                value={filters.labId ?? ''}
                onChange={(e) => updateFilter('labId', e.target.value || undefined)}
              >
                <option value="">All labs</option>
                {labs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold small mb-1">Subject</label>
              <select
                className="form-select form-select-sm"
                disabled={subjectsLoading}
                value={filters.subjectId ?? ''}
                onChange={(e) => updateFilter('subjectId', e.target.value || undefined)}
              >
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold small mb-1">Class Section</label>
              <select
                className="form-select form-select-sm"
                disabled={sectionsLoading}
                value={filters.classSectionId ?? ''}
                onChange={(e) => updateFilter('classSectionId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">All class sections</option>
                {classSections.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade.name} · {c.name} ({c.academicYear})</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label fw-semibold small mb-1">From</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom ?? ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
              />
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label fw-semibold small mb-1">To</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo ?? ''}
                onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <LabUtilisationPanel filters={filters} />
        </div>
        <div className="col-lg-6">
          <EquipmentHealthPanel filters={filters} />
        </div>
        <div className="col-lg-6">
          <ExperimentCoveragePanel filters={filters} />
        </div>
        <div className="col-lg-6">
          <LabReportPerformancePanel filters={filters} />
        </div>
      </div>
    </div>
  )
}
