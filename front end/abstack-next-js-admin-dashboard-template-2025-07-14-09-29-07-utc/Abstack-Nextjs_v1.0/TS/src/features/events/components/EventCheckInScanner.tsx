'use client'
import { useEffect, useRef, useState } from 'react'
import { QrCode, CheckCircle2, XCircle, Users, UserCheck, UserX, Download } from 'lucide-react'
import { useAttendanceDashboard } from '../hooks/useAttendanceDashboard'
import { useScanTicket } from '../hooks/useScanTicket'
import { useDownloadAttendanceReportPdf } from '../hooks/useDownloadAttendanceReportPdf'
import type { ScanResult } from '@/types/sims/events'

interface EventCheckInScannerProps {
  eventId: string
  eventName: string
}

type FeedbackState = { kind: 'success'; result: ScanResult } | { kind: 'error'; message: string } | null

export function EventCheckInScanner({ eventId, eventName }: EventCheckInScannerProps) {
  const { data: dashboard } = useAttendanceDashboard(eventId)
  const scanTicket = useScanTicket()
  const { download, isDownloading } = useDownloadAttendanceReportPdf()

  const [code, setCode] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5ScannerRef = useRef<unknown>(null)

  const scan = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    scanTicket.mutate(
      { eventId, code: trimmed },
      {
        onSuccess: (result) => setFeedback({ kind: 'success', result }),
        onError: (err: any) => setFeedback({ kind: 'error', message: err?.response?.data?.message ?? 'Could not check in this code.' }),
      },
    )
  }

  const startScanner = async () => {
    if (typeof window === 'undefined') return
    const { Html5QrcodeScanner } = await import('html5-qrcode')
    setScannerOpen(true)
    setTimeout(() => {
      if (!scannerRef.current) return
      const scanner = new Html5QrcodeScanner(
        'event-check-in-scanner-div',
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false,
      )
      scanner.render(
        (decoded: string) => {
          setCode(decoded)
          scanner.clear().catch(() => null)
          setScannerOpen(false)
          void scan(decoded)
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

  return (
    <div className="container-fluid px-0">
      <div
        className="d-flex align-items-center gap-3 px-4 py-4 mb-4 rounded-3"
        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff' }}
      >
        <QrCode size={36} />
        <div>
          <h4 className="mb-0 fw-bold">{eventName}</h4>
          <small className="opacity-75">Scan guardian tickets or student QR codes to check them in</small>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">Capacity</div>
            <div className="fs-4 fw-bold">{dashboard?.capacity ?? '-'}</div>
          </div></div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">Registered</div>
            <div className="fs-4 fw-bold text-primary">{dashboard?.registeredCount ?? '-'}</div>
          </div></div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">Checked In</div>
            <div className="fs-4 fw-bold text-success">{dashboard?.checkedInCount ?? '-'}</div>
          </div></div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">No-Show</div>
            <div className="fs-4 fw-bold text-danger">{dashboard?.noShowCount ?? '-'}</div>
          </div></div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">Students Expected</div>
            <div className="fs-4 fw-bold">{dashboard?.participantsExpectedCount ?? '-'}</div>
          </div></div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm h-100"><div className="card-body py-3">
            <div className="text-muted small">Students In</div>
            <div className="fs-4 fw-bold text-success">{dashboard?.participantsCheckedInCount ?? '-'}</div>
          </div></div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column gap-3">
              <h6 className="card-title fw-bold mb-0">Scan or Enter Ticket Code</h6>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control font-monospace"
                  placeholder="Ticket / participant code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void scan(code) }}
                  disabled={scanTicket.isPending}
                />
                <button className="btn btn-outline-primary flex-shrink-0" onClick={startScanner} disabled={scanTicket.isPending}>
                  <QrCode size={16} />
                </button>
              </div>
              <button
                className="btn btn-primary fw-semibold"
                onClick={() => void scan(code)}
                disabled={!code.trim() || scanTicket.isPending}
              >
                {scanTicket.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Check In'}
              </button>

              {scannerOpen && (
                <div>
                  <div ref={scannerRef} id="event-check-in-scanner-div" />
                  <button className="btn btn-sm btn-outline-secondary mt-2 w-100" onClick={stopScanner}>
                    Close Scanner
                  </button>
                </div>
              )}

              <button
                className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-2 mt-auto"
                onClick={() => void download(eventId, eventName)}
                disabled={isDownloading}
              >
                <Download size={14} /> {isDownloading ? 'Preparing…' : 'Download Attendance Report (PDF)'}
              </button>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-7">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column gap-3">
              <h6 className="card-title fw-bold mb-0">Result</h6>

              {!feedback && (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-5">
                  <Users size={40} className="mb-2 opacity-25" />
                  <small>Awaiting scan…</small>
                </div>
              )}

              {feedback?.kind === 'error' && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
                  <XCircle size={22} />
                  <div>
                    <div className="fw-bold">Check-in rejected</div>
                    <div className="small">{feedback.message}</div>
                  </div>
                </div>
              )}

              {feedback?.kind === 'success' && feedback.result.type === 'guardian' && (
                <div className="alert alert-success d-flex align-items-center gap-3 mb-0">
                  <UserCheck size={28} />
                  <div>
                    <div className="fw-bold fs-5">{feedback.result.guestName}</div>
                    {feedback.result.childName && <div className="small">Attending for: {feedback.result.childName}</div>}
                    <div className="small text-muted">Checked in {new Date(feedback.result.scannedAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              )}

              {feedback?.kind === 'success' && feedback.result.type === 'student' && (
                <div className="alert alert-success d-flex align-items-center gap-3 mb-0">
                  <CheckCircle2 size={28} />
                  <div>
                    <div className="fw-bold fs-5">{feedback.result.studentName}</div>
                    {feedback.result.className && <div className="small">Class: {feedback.result.className}</div>}
                    <div className="small text-muted">Checked in {new Date(feedback.result.scannedAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              )}

              {feedback && (
                <button
                  className="btn btn-outline-secondary btn-sm mt-auto d-flex align-items-center gap-2 justify-content-center"
                  onClick={() => { setFeedback(null); setCode('') }}
                >
                  <UserX size={14} /> Scan Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
