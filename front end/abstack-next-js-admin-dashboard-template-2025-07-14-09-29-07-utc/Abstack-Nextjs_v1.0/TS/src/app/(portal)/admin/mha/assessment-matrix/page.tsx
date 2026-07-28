'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Table2, Printer, Download, Check, Minus } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import { useAssessmentMatrix } from '@/features/assessment-matrix/hooks/useAssessmentMatrix'
import { AGE_BAND_LABELS, AGE_BAND_ORDER } from '@/types/sims/assessment-matrix'

function AssessmentMatrixPage() {
  const { showNotification } = useNotificationContext()
  const { data: rows = [], isLoading } = useAssessmentMatrix()
  const [exporting, setExporting] = useState(false)

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    setExporting(true)
    try {
      const res = await apiClient.get(ENDPOINTS.ASSESSMENT_MATRIX.EXPORT, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'assessment-matrix.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showNotification({ variant: 'danger', message: 'Export failed. Please try again.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <Table2 size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Recommended Assessment Matrix</h4>
            <p className="text-muted small mb-0">
              Stakeholder-defined age-band guidance — SRS Addendum, Module 12, Section 12.4
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 d-print-none">
          <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={handlePrint}>
            <Printer size={14} />
            Print
          </button>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-1"
            style={{ background: '#667eea', color: '#fff' }}
            onClick={handleDownloadPdf}
            disabled={exporting}
          >
            {exporting ? <span className="spinner-border spinner-border-sm" /> : <Download size={14} />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <span className="fw-semibold">
            {isLoading ? 'Loading…' : `${rows.length} Domain${rows.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading && (
          <div className="p-3 placeholder-glow">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="placeholder col-12 mb-2 rounded" style={{ height: 38 }} />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="text-center text-muted py-5">No matrix data found.</div>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr className="text-muted small">
                  <th className="px-3">Domain</th>
                  {AGE_BAND_ORDER.map((band) => (
                    <th key={band} className="text-center">{AGE_BAND_LABELS[band]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.domainId}>
                    <td className="px-3">
                      <Link href={`/admin/mha/disorder-registry/${row.domainId}`} className="fw-medium text-decoration-none">
                        {row.domainName}
                      </Link>
                      <span className="text-muted small ms-2">{row.domainCode}</span>
                    </td>
                    {AGE_BAND_ORDER.map((band) => (
                      <td key={band} className="text-center">
                        {row.bands[band] ? (
                          <Check size={16} className="text-success" aria-label="Recommended" />
                        ) : (
                          <Minus size={16} className="text-muted" aria-label="Not recommended" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminAssessmentMatrixPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.COUNSELOR, ROLES.SCHOOL_PSYCHOLOGIST]}>
      <AssessmentMatrixPage />
    </RoleGuard>
  )
}
