'use client'
import React, { useState, useEffect, useRef } from 'react'
import { ClipboardList, QrCode, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useBookByBarcode } from '@/features/library/hooks/useBookByBarcode'
import { useIssueBook } from '@/features/library/hooks/useIssueBook'
import { useReturnBook } from '@/features/library/hooks/useReturnBook'
import { useLoans } from '@/features/library/hooks/useLoans'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { BookIssuance } from '@/types/sims/library'

interface StudentResult { id: string; firstName: string; lastName: string; admissionNumber: string; grade?: { name?: string } }

function IssuanceContent() {
  const { showNotification } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'issue' | 'return'>('issue')

  // Issue form state
  const [barcode, setBarcode] = useState('')
  const [committedBarcode, setCommittedBarcode] = useState('')
  const [admNo, setAdmNo] = useState('')
  const [student, setStudent] = useState<StudentResult | null>(null)
  const [studentLoading, setStudentLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5ScannerRef = useRef<unknown>(null)

  // Return state
  const [selectedLoan, setSelectedLoan] = useState<BookIssuance | null>(null)

  const { data: bookResult, isError: bookNotFound, isFetching: bookFetching } = useBookByBarcode(committedBarcode || undefined)
  const { data: activeLoans = [], isLoading: loansLoading, refetch: refetchLoans } = useLoans('active')
  const { data: overdueLoans = [] } = useLoans('overdue')
  const issueBook = useIssueBook()
  const returnBook = useReturnBook()

  // Start barcode scanner
  const startScanner = async () => {
    if (typeof window === 'undefined') return
    const { Html5QrcodeScanner } = await import('html5-qrcode')
    setScannerOpen(true)
    setTimeout(() => {
      if (!scannerRef.current) return
      const scanner = new Html5QrcodeScanner(
        'qr-scanner-div',
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false,
      )
      scanner.render(
        (decoded: string) => {
          setBarcode(decoded)
          setCommittedBarcode(decoded)
          scanner.clear().catch(() => null)
          setScannerOpen(false)
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

  // Student lookup by admission number
  useEffect(() => {
    if (!admNo || admNo.length < 3) { setStudent(null); return }
    const t = setTimeout(async () => {
      setStudentLoading(true)
      try {
        const res = await apiClient.get(ENDPOINTS.STUDENTS.SEARCH, { params: { q: admNo } })
        const results: StudentResult[] = res.data?.data ?? res.data ?? []
        const match = results.find((s) => s.admissionNumber?.toLowerCase() === admNo.toLowerCase()) ?? results[0] ?? null
        setStudent(match)
      } catch {
        setStudent(null)
      } finally {
        setStudentLoading(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [admNo])

  const handleIssue = () => {
    if (!bookResult || !student) return
    issueBook.mutate(
      { bookId: bookResult.id, studentId: student.id },
      {
        onSuccess: () => {
          showNotification({ variant: 'success', message: `"${bookResult.title}" issued to ${student.firstName} ${student.lastName}.` })
          setBarcode(''); setCommittedBarcode(''); setAdmNo(''); setStudent(null)
          refetchLoans()
        },
        onError: (e: Error & { response?: { data?: { message?: string } } }) =>
          showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Issue failed.' }),
      },
    )
  }

  const handleReturn = (loan: BookIssuance) => {
    if (!window.confirm(`Return "${loan.bookTitle}" from ${loan.borrowerName}?${loan.daysOverdue > 0 ? ` Estimated fine: Rs. ${loan.daysOverdue * 10}` : ''}`)) return
    returnBook.mutate(loan.id, {
      onSuccess: (result) => {
        const fine = result.fineAmount ?? 0
        showNotification({
          variant: 'success',
          message: fine > 0 ? `Book returned. Fine applied: Rs. ${fine.toLocaleString()}` : 'Book returned successfully — no fine.',
        })
        setSelectedLoan(null)
        refetchLoans()
      },
      onError: (e: Error & { response?: { data?: { message?: string } } }) =>
        showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Return failed.' }),
    })
  }

  const allActiveAndOverdue = [...activeLoans, ...overdueLoans.filter(o => !activeLoans.find(a => a.id === o.id))]

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <ClipboardList size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Issue / Return Books</h4>
          <p className="mb-0 text-muted small">Scan or enter barcode to issue or receive books</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="btn-group mb-4" role="group">
        <button type="button" className={`btn btn-sm fw-semibold ${activeTab === 'issue' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('issue')}>Issue Book</button>
        <button type="button" className={`btn btn-sm fw-semibold ${activeTab === 'return' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setActiveTab('return')}>Return Book</button>
      </div>

      {/* ISSUE TAB */}
      {activeTab === 'issue' && (
        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header border-0 py-2 px-4 rounded-top-4" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                <span className="fw-bold text-white small">Step 1 — Scan Book Barcode</span>
              </div>
              <div className="card-body p-4">
                <div className="d-flex gap-2 mb-3">
                  <input
                    className="form-control form-control-sm"
                    placeholder="Enter or scan book barcode…"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setCommittedBarcode(barcode) }}
                  />
                  <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 flex-shrink-0" onClick={startScanner}>
                    <QrCode size={13} /> Scan
                  </button>
                  <button className="btn btn-sm btn-primary flex-shrink-0" onClick={() => setCommittedBarcode(barcode)}>Go</button>
                </div>

                {scannerOpen && (
                  <div className="mb-3">
                    <div ref={scannerRef} id="qr-scanner-div" />
                    <button className="btn btn-sm btn-outline-secondary mt-2" onClick={stopScanner}>Close Scanner</button>
                  </div>
                )}

                {bookFetching && <div className="text-muted small">Looking up book…</div>}
                {bookNotFound && committedBarcode && <div className="alert alert-danger py-2 small mb-0">No book found with barcode "{committedBarcode}".</div>}
                {bookResult && (
                  <div className="alert alert-success py-2 mb-0">
                    <div className="fw-semibold small">{bookResult.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>by {bookResult.author} · {bookResult.availableCopies} copies available</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mt-3">
              <div className="card-header border-0 py-2 px-4 rounded-top-4" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                <span className="fw-bold text-white small">Step 2 — Find Student</span>
              </div>
              <div className="card-body p-4">
                <input
                  className="form-control form-control-sm mb-2"
                  placeholder="Enter admission number (e.g. SIMS/2026/00001)…"
                  value={admNo}
                  onChange={(e) => setAdmNo(e.target.value)}
                />
                {studentLoading && <div className="text-muted small">Searching…</div>}
                {!studentLoading && admNo.length >= 3 && !student && <div className="text-danger small">No student found.</div>}
                {student && (
                  <div className="alert alert-success py-2 mb-0">
                    <div className="fw-semibold small">{student.firstName} {student.lastName}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{student.admissionNumber}</div>
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn fw-semibold text-white w-100 mt-3"
              style={{ background: bookResult && student ? 'linear-gradient(135deg,#10b981,#059669)' : '#cbd5e1', border: 'none' }}
              disabled={!bookResult || !student || issueBook.isPending}
              onClick={handleIssue}
            >
              <CheckCircle size={15} className="me-2" />
              {issueBook.isPending ? 'Issuing…' : 'Issue Book'}
            </button>
          </div>

          {/* Active loans mini-list */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header border-0 py-2 px-4 rounded-top-4 d-flex align-items-center justify-content-between" style={{ background: '#f8fafc' }}>
                <span className="fw-semibold small text-muted">Recent Active Loans</span>
                <span className="badge rounded-pill bg-primary" style={{ fontSize: '0.72rem' }}>{activeLoans.length}</span>
              </div>
              <div className="card-body p-0" style={{ maxHeight: 400, overflowY: 'auto' }}>
                {loansLoading && <div className="p-4 text-muted small">Loading…</div>}
                {!loansLoading && activeLoans.length === 0 && <div className="p-4 text-muted small text-center">No active loans.</div>}
                {activeLoans.slice(0, 10).map((l) => (
                  <div key={l.id} className="px-4 py-2 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <div className="small fw-semibold">{l.bookTitle}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{l.borrowerName} · Due {new Date(l.dueAt).toLocaleDateString()}</div>
                    </div>
                    {l.daysOverdue > 0 && <span className="badge rounded-pill" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.68rem' }}>{l.daysOverdue}d overdue</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RETURN TAB */}
      {activeTab === 'return' && (
        <div>
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
              <span className="fw-bold text-white d-flex align-items-center gap-2"><RotateCcw size={15} /> Select Loan to Return</span>
              <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>{allActiveAndOverdue.length} active</span>
            </div>
            <div className="card-body p-0">
              {loansLoading && <div className="p-4 text-muted small">Loading loans…</div>}
              {!loansLoading && allActiveAndOverdue.length === 0 && <div className="p-4 text-center text-muted"><CheckCircle size={28} className="mb-2 text-success" /><br />No active loans.</div>}
              {allActiveAndOverdue.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th className="px-4 py-3 text-muted small fw-semibold border-0">Book</th>
                        <th className="py-3 text-muted small fw-semibold border-0">Student</th>
                        <th className="py-3 text-muted small fw-semibold border-0">Due Date</th>
                        <th className="py-3 text-muted small fw-semibold border-0">Overdue / Fine</th>
                        <th className="py-3 text-muted small fw-semibold border-0 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allActiveAndOverdue.map((l) => (
                        <tr key={l.id} className={selectedLoan?.id === l.id ? 'table-primary' : ''}>
                          <td className="px-4 small">
                            <div className="fw-semibold">{l.bookTitle}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>BC: {l.bookBarcode}</div>
                          </td>
                          <td className="small">
                            <div>{l.borrowerName}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{l.admissionNumber}</div>
                          </td>
                          <td className="small text-muted">{new Date(l.dueAt).toLocaleDateString()}</td>
                          <td>
                            {l.daysOverdue > 0
                              ? <span className="badge rounded-pill d-flex align-items-center gap-1" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', width: 'fit-content' }}><AlertTriangle size={10} />{l.daysOverdue}d · Rs.{l.daysOverdue * 10}</span>
                              : <span className="text-muted small">On time</span>
                            }
                          </td>
                          <td className="px-4">
                            <button
                              className="btn btn-sm fw-semibold text-white"
                              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', fontSize: '0.75rem' }}
                              disabled={returnBook.isPending}
                              onClick={() => handleReturn(l)}
                            >
                              <RotateCcw size={11} className="me-1" />Return
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LibraryIssuancePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.LIBRARIAN]}>
      <IssuanceContent />
    </RoleGuard>
  )
}
