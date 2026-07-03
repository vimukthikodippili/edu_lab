'use client'
import React, { useState } from 'react'
import {
  BarChart2,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAllClassSections } from '@/features/attendance/hooks/useAllClassSections'
import {
  useAttendanceReport,
  type ReportFilters,
  type StudentReportRow,
} from '@/features/attendance/hooks/useAttendanceReport'
import { useNotificationContext } from '@/context/useNotificationContext'
import apiClient from '@/lib/api/axios'
import type { MyClassSection } from '@/features/attendance/types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function defaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

// ─── Rate badge ───────────────────────────────────────────────────────────────

function RateBadge({ rate }: { rate: number }) {
  if (rate < 75) {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.75rem' }}
      >
        {rate}%
      </span>
    )
  }
  if (rate < 90) {
    return (
      <span
        className="badge rounded-pill px-2 py-1 fw-bold"
        style={{ background: '#fef9c3', color: '#92400e', fontSize: '0.75rem' }}
      >
        {rate}%
      </span>
    )
  }
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem' }}
    >
      {rate}%
    </span>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div
      className="card border-0 shadow-sm h-100"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="card-body py-3">
        <div
          className="fw-bold mb-1"
          style={{ fontSize: '1.5rem', color: accent }}
        >
          {value}
        </div>
        <div className="text-muted small">{label}</div>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <>
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm placeholder-glow">
              <div className="card-body py-3">
                <span className="placeholder col-6 d-block mb-2" style={{ height: 28 }} />
                <span className="placeholder col-8 d-block" style={{ height: 14 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="placeholder-glow px-3 py-2 border-bottom"
            >
              <span className="placeholder col-12 rounded" style={{ height: 36 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main inner component ─────────────────────────────────────────────────────

function AttendanceReportsContent() {
  const { showNotification } = useNotificationContext()
  const defaults = defaultDateRange()

  const [classSectionId, setClassSectionId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState('')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [activeFilters, setActiveFilters] = useState<ReportFilters | null>(null)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const { data: sections = [], isLoading: sectionsLoading } = useAllClassSections()
  const {
    data: report,
    isLoading: reportLoading,
    isError,
    error,
  } = useAttendanceReport(activeFilters)


  const handleGenerate = () => {
    if (!classSectionId && !studentId.trim()) {
      showNotification({
        variant: 'warning',
        message: 'Select at least a class section or enter a student ID to generate a report.',
      })
      return
    }
    setActiveFilters({
      classSectionId: classSectionId ? Number(classSectionId) : undefined,
      studentId: studentId.trim() || undefined,
      startDate,
      endDate,
    })
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!activeFilters) return
    setExporting(format)
    try {
      const params: Record<string, unknown> = {
        startDate: activeFilters.startDate,
        endDate: activeFilters.endDate,
        format,
      }
      if (activeFilters.classSectionId) params.classSectionId = activeFilters.classSectionId
      if (activeFilters.studentId) params.studentId = activeFilters.studentId

      const res = await apiClient.get('/attendance/reports/export', {
        params,
        responseType: 'blob',
      })
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-report-${activeFilters.startDate}-${activeFilters.endDate}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showNotification({
        variant: 'danger',
        message: 'Export failed. Please try again.',
      })
    } finally {
      setExporting(null)
    }
  }

  const hasReport = !!report && !reportLoading

  return (
    <div className="container-fluid px-4 py-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <BarChart2 size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Attendance Reports</h4>
          <p className="text-muted small mb-0">
            Generate and export attendance summaries by class or student
          </p>
        </div>
      </div>

      {/* ── Filter card ─────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold text-muted mb-1">
                Class Section
              </label>
              {sectionsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select form-select-sm"
                  value={classSectionId}
                  onChange={(e) =>
                    setClassSectionId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  <option value="">— All sections —</option>
                  {sections.map((s: MyClassSection) => (
                    <option key={s.id} value={s.id}>
                      {s.grade.name} · Section {s.name} ({s.academicYear})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label small fw-semibold text-muted mb-1">
                From
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label small fw-semibold text-muted mb-1">
                To
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-4">
              <button
                type="button"
                className="btn btn-sm text-white fw-semibold w-100 d-flex align-items-center justify-content-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  height: 38,
                }}
                onClick={handleGenerate}
                disabled={reportLoading}
              >
                {reportLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ width: 14, height: 14, borderWidth: 2 }}
                    />
                    Generating…
                  </>
                ) : (
                  <>
                    <BarChart2 size={14} />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Empty state — no filters yet ────────────────────────────── */}
      {!activeFilters && !reportLoading && (
        <div className="text-center py-5 text-muted">
          <BarChart2 size={48} className="mb-3 opacity-25" />
          <p className="fw-semibold mb-1">No report generated yet</p>
          <p className="small">
            Select a class section and date range, then click Generate Report.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {reportLoading && <ReportSkeleton />}

      {/* ── Error state ──────────────────────────────────────────────── */}
      {isError && !reportLoading && (
        <div className="alert alert-danger py-2 small">
          {(error as Error & { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Failed to generate report. Please try again.'}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {hasReport && (
        <>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <SummaryCard
                label="Total Attendance Days"
                value={report.summary.total}
                accent="#667eea"
              />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard
                label="Present"
                value={report.summary.present}
                accent="#15803d"
              />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard
                label="Absent"
                value={report.summary.absent}
                accent="#dc2626"
              />
            </div>
            <div className="col-6 col-md-3">
              <SummaryCard
                label="Attendance Rate"
                value={`${report.summary.attendanceRate}%`}
                accent={
                  report.summary.attendanceRate < 75
                    ? '#dc2626'
                    : report.summary.attendanceRate < 90
                      ? '#d97706'
                      : '#15803d'
                }
              />
            </div>
          </div>

          {/* Results table card */}
          <div className="card border-0 shadow-sm">
            <div
              className="card-header border-0 py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{ background: '#f8fafc' }}
            >
              <div className="d-flex align-items-center gap-2">
                <Users size={16} className="text-muted" />
                <span className="fw-semibold small">
                  {report.rows.length} student{report.rows.length !== 1 ? 's' : ''} ·{' '}
                  {report.filters.startDate} to {report.filters.endDate}
                </span>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleExport('excel')}
                  disabled={!hasReport || exporting !== null}
                >
                  {exporting === 'excel' ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ width: 12, height: 12, borderWidth: 1.5 }}
                    />
                  ) : (
                    <FileSpreadsheet size={13} />
                  )}
                  Export Excel
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => handleExport('pdf')}
                  disabled={!hasReport || exporting !== null}
                >
                  {exporting === 'pdf' ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      style={{ width: 12, height: 12, borderWidth: 1.5 }}
                    />
                  ) : (
                    <FileText size={13} />
                  )}
                  Export PDF
                </button>
              </div>
            </div>

            {report.rows.length === 0 ? (
              <div className="card-body text-center text-muted py-5">
                <Download size={36} className="mb-3 opacity-25" />
                <p className="fw-semibold mb-1">No attendance records found</p>
                <p className="small">
                  No data for the selected filters and date range.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm mb-0 align-middle">
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th className="ps-3 fw-semibold text-muted small" style={{ width: 40 }}>
                        #
                      </th>
                      <th className="fw-semibold text-muted small">Student</th>
                      <th className="fw-semibold text-muted small">Adm. No.</th>
                      <th className="fw-semibold text-muted small text-center">Present</th>
                      <th className="fw-semibold text-muted small text-center">Absent</th>
                      <th className="fw-semibold text-muted small text-center">Late</th>
                      <th className="fw-semibold text-muted small text-center">Excused</th>
                      <th className="fw-semibold text-muted small text-center">Medical</th>
                      <th className="fw-semibold text-muted small text-center">Total</th>
                      <th className="fw-semibold text-muted small text-center pe-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row: StudentReportRow, i: number) => (
                      <tr key={row.studentId} style={{ verticalAlign: 'middle' }}>
                        <td className="text-muted small ps-3">{i + 1}</td>
                        <td>
                          <span className="fw-semibold small">{row.studentName}</span>
                        </td>
                        <td className="text-muted small">{row.admissionNumber}</td>
                        <td className="text-center">
                          <span
                            className="badge rounded-pill"
                            style={{ background: '#dcfce7', color: '#15803d', minWidth: 32 }}
                          >
                            {row.present}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className="badge rounded-pill"
                            style={{ background: '#fee2e2', color: '#dc2626', minWidth: 32 }}
                          >
                            {row.absent}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className="badge rounded-pill"
                            style={{ background: '#fef9c3', color: '#92400e', minWidth: 32 }}
                          >
                            {row.late}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className="badge rounded-pill"
                            style={{ background: '#e0f2fe', color: '#0284c7', minWidth: 32 }}
                          >
                            {row.excused}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className="badge rounded-pill"
                            style={{ background: '#ede9fe', color: '#7c3aed', minWidth: 32 }}
                          >
                            {row.medical}
                          </span>
                        </td>
                        <td className="text-center fw-semibold small">{row.total}</td>
                        <td className="text-center pe-3">
                          <RateBadge rate={row.attendanceRate} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary footer */}
                  <tfoot style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                    <tr style={{ verticalAlign: 'middle' }}>
                      <td />
                      <td className="fw-bold small ps-0" colSpan={2}>
                        TOTAL
                      </td>
                      <td className="text-center fw-bold small">{report.summary.present}</td>
                      <td className="text-center fw-bold small">{report.summary.absent}</td>
                      <td className="text-center fw-bold small">{report.summary.late}</td>
                      <td className="text-center fw-bold small">{report.summary.excused}</td>
                      <td className="text-center fw-bold small">{report.summary.medical}</td>
                      <td className="text-center fw-bold small">{report.summary.total}</td>
                      <td className="text-center pe-3">
                        <RateBadge rate={report.summary.attendanceRate} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <p className="text-muted mt-2" style={{ fontSize: '0.7rem' }}>
            Generated at {new Date(report.generatedAt).toLocaleString('en-LK')} ·
            Attendance Rate = (Present + Late) ÷ Total × 100
          </p>
        </>
      )}

    </div>
  )
}

// ─── Export with role guard ───────────────────────────────────────────────────

export default function AttendanceReportsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <AttendanceReportsContent />
    </RoleGuard>
  )
}
