'use client'
import React, { useEffect, useRef, useState } from 'react'
import { QrCode, CheckCircle2, XCircle, AlertTriangle, RotateCcw, UserCheck } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { Student } from '@/features/students/types'

type LookupState = 'idle' | 'loading' | 'found' | 'not_found'

const STATUS_LABELS: Record<Student['status'], string> = {
  active: 'Active',
  graduated: 'Graduated',
  transferred: 'Transferred',
  withdrawn: 'Withdrawn',
}

function ScanContent() {
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [student, setStudent] = useState<Student | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5ScannerRef = useRef<unknown>(null)

  const lookup = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setLookupState('loading')
    setStudent(null)
    try {
      const { data } = await apiClient.get<Student>(ENDPOINTS.STUDENTS.BY_ADMISSION_NUMBER(trimmed))
      setStudent(data)
      setLookupState('found')
    } catch {
      setLookupState('not_found')
    }
  }

  const startScanner = async () => {
    if (typeof window === 'undefined') return
    const { Html5QrcodeScanner } = await import('html5-qrcode')
    setScannerOpen(true)
    setTimeout(() => {
      if (!scannerRef.current) return
      const scanner = new Html5QrcodeScanner(
        'security-qr-scanner-div',
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false,
      )
      scanner.render(
        (decoded: string) => {
          setAdmissionNumber(decoded)
          scanner.clear().catch(() => null)
          setScannerOpen(false)
          void lookup(decoded)
        },
        () => null,
      )
      html5ScannerRef.current = scanner
    }, 100)
  }

  const stopScanner = () => {
    const s = html5ScannerRef.current as { clear?: () => Promise<void> } | null
    if (s?.clear) s.clear().catch(() => null)
    setScannerOpen(false)
  }

  useEffect(() => () => stopScanner(), [])

  const handleReset = () => {
    stopScanner()
    setAdmissionNumber('')
    setLookupState('idle')
    setStudent(null)
  }

  const isActive = student?.status === 'active'

  return (
    <div className="container-fluid px-0">
      <div
        className="d-flex align-items-center gap-3 px-4 py-4 mb-4 rounded-3"
        style={{ background: 'linear-gradient(135deg, #0f766e, #115e59)', color: '#fff' }}
      >
        <QrCode size={36} />
        <div>
          <h4 className="mb-0 fw-bold">QR Verification</h4>
          <small className="opacity-75">Scan a student&apos;s ID card to verify identity and enrollment status</small>
        </div>
      </div>

      <div className="row g-4 px-2">
        <div className="col-12 col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column gap-3">
              <h6 className="card-title fw-bold mb-0">Scan or Enter Admission Number</h6>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="SIMS/2026/00001"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void lookup(admissionNumber) }}
                  disabled={lookupState === 'loading'}
                />
                <button
                  className="btn btn-outline-primary flex-shrink-0"
                  onClick={startScanner}
                  disabled={lookupState === 'loading'}
                >
                  <QrCode size={16} />
                </button>
              </div>
              <button
                className="btn fw-semibold text-white"
                style={{ background: '#0f766e', border: 'none' }}
                onClick={() => void lookup(admissionNumber)}
                disabled={!admissionNumber.trim() || lookupState === 'loading'}
              >
                {lookupState === 'loading' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Looking up…
                  </>
                ) : (
                  'Verify'
                )}
              </button>

              {scannerOpen && (
                <div>
                  <div ref={scannerRef} id="security-qr-scanner-div" />
                  <button className="btn btn-sm btn-outline-secondary mt-2 w-100" onClick={stopScanner}>
                    Close Scanner
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-7">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column gap-3">
              <h6 className="card-title fw-bold mb-0">Result</h6>

              {lookupState === 'idle' && (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5">
                  <QrCode size={40} className="mb-2 opacity-25" />
                  <small>Awaiting scan…</small>
                </div>
              )}

              {lookupState === 'not_found' && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
                  <XCircle size={22} />
                  <div>
                    <div className="fw-bold">No student found</div>
                    <div className="small">No student matches admission number &quot;{admissionNumber}&quot;.</div>
                  </div>
                </div>
              )}

              {lookupState === 'found' && student && (
                <div className="d-flex flex-column gap-3">
                  <div className={`alert d-flex align-items-center gap-3 mb-0 ${isActive ? 'alert-success' : 'alert-warning'}`}>
                    {isActive ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                    <div className="flex-grow-1">
                      <div className="fw-bold fs-5">{student.firstName} {student.lastName}</div>
                      <div className="small font-monospace">{student.admissionNumber}</div>
                    </div>
                    <span className={`badge ${isActive ? 'bg-success' : 'bg-warning text-dark'}`}>
                      {STATUS_LABELS[student.status]}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap gap-3 border rounded p-3 bg-light">
                    <div>
                      <div className="text-muted small">Grade</div>
                      <div className="fw-semibold">{student.grade.name}</div>
                    </div>
                    <div>
                      <div className="text-muted small">Section</div>
                      <div className="fw-semibold">{student.classSection.name}</div>
                    </div>
                  </div>

                  {!isActive && (
                    <div className="alert alert-warning py-2 small mb-0 d-flex align-items-center gap-2">
                      <AlertTriangle size={14} />
                      This student&apos;s status is <strong>{STATUS_LABELS[student.status]}</strong> — verify before allowing entry/exit.
                    </div>
                  )}

                  {isActive && (
                    <div className="alert alert-info py-2 small mb-0 d-flex align-items-center gap-2">
                      <UserCheck size={14} />
                      Identity confirmed — currently enrolled and active.
                    </div>
                  )}
                </div>
              )}

              {(lookupState === 'found' || lookupState === 'not_found') && (
                <button
                  className="btn btn-outline-secondary btn-sm mt-auto d-flex align-items-center gap-2 justify-content-center"
                  onClick={handleReset}
                >
                  <RotateCcw size={14} />
                  Verify Next Student
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SecurityScanPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER]}>
      <ScanContent />
    </RoleGuard>
  )
}
