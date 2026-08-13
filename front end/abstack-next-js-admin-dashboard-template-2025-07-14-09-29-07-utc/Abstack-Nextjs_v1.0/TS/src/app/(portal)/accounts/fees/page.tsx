'use client'
import React, { useState } from 'react'
import { AlertTriangle, Bell, DollarSign, Plus, Send, Tag, Trash2, Wallet } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAcademicTerms } from '@/features/grades/hooks/useAcademicTerms'
import { useGrades } from '@/features/students/hooks/useGrades'
import { useFeeStructures } from '@/features/fees/hooks/useFeeStructures'
import { useCreateFeeStructure } from '@/features/fees/hooks/useCreateFeeStructure'
import { useDeleteFeeStructure } from '@/features/fees/hooks/useDeleteFeeStructure'
import { useGenerateInvoices } from '@/features/fees/hooks/useGenerateInvoices'
import { useSendDueSoonReminders } from '@/features/fees/hooks/useSendDueSoonReminders'
import { useSendOverdueNotices } from '@/features/fees/hooks/useSendOverdueNotices'
import { useInvoices } from '@/features/fees/hooks/useInvoices'
import { useCreateWaiverRequest } from '@/features/fees/hooks/useCreateWaiverRequest'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { Invoice, InvoiceStatus } from '@/types/sims/fee'
import PrincipalPageHeader from '@/components/principal/PrincipalPageHeader'

const STATUS_COLORS: Record<InvoiceStatus, { bg: string; color: string; label: string }> = {
  paid: { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  pending: { bg: '#fef9c3', color: '#92400e', label: 'Pending' },
  overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
}

function StatusBadge({ invoice }: { invoice: Invoice }) {
  const cfg = STATUS_COLORS[invoice.effectiveStatus]
  return (
    <span
      className="badge rounded-pill px-2 py-1 fw-bold"
      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.7rem' }}
    >
      {cfg.label}
    </span>
  )
}

function FeesPageContent() {
  const { showNotification } = useNotificationContext()

  const [selectedTermId, setSelectedTermId] = useState<number | null>(null)
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(null)
  const [feeCategory, setFeeCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [reminderDaysBefore, setReminderDaysBefore] = useState('7')

  const { data: terms = [], isLoading: termsLoading } = useAcademicTerms()
  const { data: grades = [], isLoading: gradesLoading } = useGrades()
  const { data: structures = [], isLoading: structuresLoading } = useFeeStructures(
    selectedGradeId,
    selectedTermId,
  )
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices({
    termId: selectedTermId,
    gradeId: selectedGradeId,
  })

  const [waiverInvoiceId, setWaiverInvoiceId] = useState<string | null>(null)
  const [waiverDiscount, setWaiverDiscount] = useState('')
  const [waiverReason, setWaiverReason] = useState('')

  const createStructure = useCreateFeeStructure()
  const deleteStructure = useDeleteFeeStructure()
  const generateInvoices = useGenerateInvoices()
  const sendDueSoonReminders = useSendDueSoonReminders()
  const sendOverdueNotices = useSendOverdueNotices()
  const createWaiverRequest = useCreateWaiverRequest()

  const handleAddStructure = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGradeId || !selectedTermId || !feeCategory.trim() || !amount) return

    createStructure.mutate(
      {
        gradeId: selectedGradeId,
        termId: selectedTermId,
        feeCategory: feeCategory.trim(),
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          setFeeCategory('')
          setAmount('')
          showNotification({ variant: 'success', message: 'Fee category added.' })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? 'Failed to add fee category.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const handleDeleteStructure = (id: number) => {
    if (!window.confirm('Remove this fee category?')) return
    deleteStructure.mutate(id)
  }

  const handleGenerate = () => {
    if (!selectedTermId) return
    if (
      !window.confirm(
        'Generate invoices for all active students for this term? This is safe to re-run — already-generated invoices are never duplicated.',
      )
    )
      return

    generateInvoices.mutate(
      { termId: selectedTermId },
      {
        onSuccess: (summary) => {
          showNotification({
            variant: 'success',
            message:
              `Generated ${summary.generatedCount} invoice(s). ` +
              `${summary.skippedAlreadyExistsCount} already existed, ` +
              `${summary.skippedNoFeeStructureCount} skipped (no fee structure configured).`,
          })
        },
        onError: () => {
          showNotification({ variant: 'danger', message: 'Failed to generate invoices.' })
        },
      },
    )
  }

  const handleSendDueSoonReminders = () => {
    const days = Number(reminderDaysBefore) || 7
    if (!window.confirm(`Send a reminder to guardians for invoices due within ${days} day(s)? Already-reminded invoices are never reminded twice.`))
      return

    sendDueSoonReminders.mutate(
      { reminderDaysBefore: days },
      {
        onSuccess: (summary) => {
          showNotification({
            variant: 'success',
            message: `${summary.remindersSent} reminder(s) sent across ${summary.invoicesProcessed} invoice(s).`,
          })
        },
        onError: () => {
          showNotification({ variant: 'danger', message: 'Failed to send reminders.' })
        },
      },
    )
  }

  const handleOpenWaiverForm = (inv: Invoice) => {
    setWaiverInvoiceId(waiverInvoiceId === inv.id ? null : inv.id)
    setWaiverDiscount('')
    setWaiverReason('')
  }

  const handleSubmitWaiver = (e: React.FormEvent, inv: Invoice) => {
    e.preventDefault()
    const discount = Number(waiverDiscount)
    if (!discount || !waiverReason.trim()) return
    createWaiverRequest.mutate(
      { invoiceId: inv.id, requestedDiscountAmount: discount, reason: waiverReason.trim() },
      {
        onSuccess: () => {
          setWaiverInvoiceId(null)
          setWaiverDiscount('')
          setWaiverReason('')
          showNotification({ variant: 'success', message: 'Waiver request submitted — pending Principal approval.' })
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
          const msg = err?.response?.data?.message ?? 'Failed to submit waiver request.'
          showNotification({ variant: 'danger', message: msg })
        },
      },
    )
  }

  const handleSendOverdueNotices = () => {
    if (!window.confirm('Send an overdue notice to guardians for all pending invoices past their due date, and mark them overdue?'))
      return

    sendOverdueNotices.mutate(undefined, {
      onSuccess: (summary) => {
        showNotification({
          variant: 'success',
          message: `${summary.invoicesFlagged} invoice(s) marked overdue, ${summary.noticesSent} notice(s) sent.`,
        })
      },
      onError: () => {
        showNotification({ variant: 'danger', message: 'Failed to send overdue notices.' })
      },
    })
  }

  return (
    <div className="container-fluid px-4 py-4 edulab-page">
      <PrincipalPageHeader
        icon={DollarSign}
        title="Fee Structure & Invoices"
        subtitle="Configure fees per grade and term, then generate invoices"
      />

      <div className="mb-4 d-flex justify-content-end">
        <button
          type="button"
          className="btn d-flex align-items-center gap-2 text-white fw-semibold px-4"
          style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)', border: 'none' }}
          disabled={!selectedTermId || generateInvoices.isPending}
          onClick={handleGenerate}
        >
          <Send size={15} />
          {generateInvoices.isPending ? 'Generating…' : 'Generate Invoices'}
        </button>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body py-3 px-4">
          <div className="row align-items-center g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Academic Term</label>
              {termsLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedTermId ?? ''}
                  onChange={(e) => setSelectedTermId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Select a term —</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Grade</label>
              {gradesLoading ? (
                <div className="placeholder-glow">
                  <span className="placeholder col-12 rounded" style={{ height: 38 }} />
                </div>
              ) : (
                <select
                  className="form-select"
                  value={selectedGradeId ?? ''}
                  onChange={(e) => setSelectedGradeId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— All grades —</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fee structure card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <Wallet size={16} />
            Fee Categories
          </span>
        </div>
        <div className="card-body p-0">
          {selectedGradeId && selectedTermId && (
            <form onSubmit={handleAddStructure} className="d-flex gap-2 align-items-end p-3 border-bottom" style={{ background: '#f8fafc' }}>
              <div className="flex-grow-1">
                <label className="form-label fw-semibold small mb-1">Category</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="e.g. Tuition"
                  value={feeCategory}
                  onChange={(e) => setFeeCategory(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div style={{ width: 160 }}>
                <label className="form-label fw-semibold small mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="5000"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-sm d-flex align-items-center gap-1 text-white fw-semibold px-3"
                style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)', border: 'none' }}
                disabled={createStructure.isPending}
              >
                <Plus size={14} /> Add
              </button>
            </form>
          )}

          {!selectedGradeId || !selectedTermId ? (
            <div className="text-center text-muted py-4">
              <p className="mb-0 small">Select a grade and term to manage fee categories.</p>
            </div>
          ) : structuresLoading ? (
            <div className="p-4">
              <div className="placeholder-glow">
                <span className="placeholder col-12 rounded" style={{ height: 32 }} />
              </div>
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center text-muted py-4">
              <p className="mb-0 small">No fee categories configured yet for this grade and term.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-2 text-muted small fw-semibold border-0">Category</th>
                    <th className="py-2 text-muted small fw-semibold border-0">Amount</th>
                    <th className="py-2 text-muted small fw-semibold border-0 text-end px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 small">{s.feeCategory}</td>
                      <td className="small">Rs. {s.amount.toLocaleString()}</td>
                      <td className="text-end px-4">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Delete"
                          onClick={() => handleDeleteStructure(s.id)}
                        >
                          <Trash2 size={14} />
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

      {/* Reminders card */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <Bell size={16} />
            Reminders & Overdue Notices
          </span>
        </div>
        <div className="card-body d-flex flex-wrap align-items-end gap-3 p-3">
          <div>
            <label className="form-label fw-semibold small mb-1">Remind days before due date</label>
            <input
              type="number"
              className="form-control form-control-sm"
              style={{ width: 100 }}
              min={1}
              max={90}
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 text-white fw-semibold px-3"
            style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)', border: 'none' }}
            disabled={sendDueSoonReminders.isPending}
            onClick={handleSendDueSoonReminders}
          >
            <Bell size={14} />
            {sendDueSoonReminders.isPending ? 'Sending…' : 'Send Due Reminders'}
          </button>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 fw-semibold px-3"
            style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}
            disabled={sendOverdueNotices.isPending}
            onClick={handleSendOverdueNotices}
          >
            <AlertTriangle size={14} />
            {sendOverdueNotices.isPending ? 'Sending…' : 'Send Overdue Notices'}
          </button>
        </div>
      </div>

      {/* Invoice list card */}
      <div className="card border-0 shadow-sm rounded-4">
        <div
          className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center justify-content-between"
          style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)' }}
        >
          <span className="fw-bold text-white d-flex align-items-center gap-2">
            <DollarSign size={16} />
            Invoices
          </span>
          <span
            className="badge rounded-pill text-white"
            style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}
          >
            {invoices.length}
          </span>
        </div>
        <div className="card-body p-0">
          {!selectedTermId ? (
            <div className="text-center text-muted py-5">
              <DollarSign size={36} className="mb-3 opacity-25" />
              <p className="mb-0">Select a term to view invoices.</p>
            </div>
          ) : invoicesLoading ? (
            <div className="p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="placeholder-glow mb-2">
                  <span className="placeholder col-12 rounded" style={{ height: 32 }} />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center text-muted py-5">
              <DollarSign size={36} className="mb-3 opacity-25" />
              <p className="mb-1 fw-semibold">No invoices yet</p>
              <p className="mb-0 small">Generate invoices for this term to see them here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">Student</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Amount</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Due Date</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Status</th>
                    <th className="py-3 text-muted small fw-semibold border-0 text-end px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <React.Fragment key={inv.id}>
                      <tr>
                        <td className="px-4">
                          <div className="fw-semibold small">{inv.studentName}</div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {inv.admissionNumber}
                          </div>
                        </td>
                        <td className="small">
                          {inv.discountAmount > 0 ? (
                            <>
                              <span className="fw-semibold text-success">Rs. {inv.payableAmount.toLocaleString()}</span>
                              <span className="text-muted text-decoration-line-through ms-1" style={{ fontSize: '0.7rem' }}>
                                Rs. {inv.amount.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            `Rs. ${inv.amount.toLocaleString()}`
                          )}
                        </td>
                        <td className="small">{inv.dueDate}</td>
                        <td>
                          <StatusBadge invoice={inv} />
                        </td>
                        <td className="text-end px-4">
                          <button
                            type="button"
                            className="btn btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                            style={{
                              background: waiverInvoiceId === inv.id ? '#fef9c3' : '#f8fafc',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              fontSize: '0.72rem',
                            }}
                            onClick={() => handleOpenWaiverForm(inv)}
                          >
                            <Tag size={11} />
                            {waiverInvoiceId === inv.id ? 'Cancel' : 'Request Waiver'}
                          </button>
                        </td>
                      </tr>
                      {waiverInvoiceId === inv.id && (
                        <tr style={{ background: '#fffbeb' }}>
                          <td colSpan={5} className="px-4 py-3">
                            <form onSubmit={(e) => handleSubmitWaiver(e, inv)} className="d-flex align-items-end gap-2 flex-wrap">
                              <div>
                                <label className="form-label fw-semibold small mb-1">
                                  Discount Amount (Rs.) — max Rs. {inv.payableAmount.toLocaleString()}
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  style={{ width: 160 }}
                                  min={0.01}
                                  max={inv.payableAmount}
                                  step="0.01"
                                  placeholder="e.g. 1000"
                                  value={waiverDiscount}
                                  onChange={(e) => setWaiverDiscount(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="flex-grow-1">
                                <label className="form-label fw-semibold small mb-1">Reason (for Principal)</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  maxLength={500}
                                  placeholder="e.g. Family financial hardship"
                                  value={waiverReason}
                                  onChange={(e) => setWaiverReason(e.target.value)}
                                  required
                                />
                              </div>
                              <button
                                type="submit"
                                className="btn btn-sm d-flex align-items-center gap-1 text-white fw-semibold px-3"
                                style={{ background: 'linear-gradient(135deg, var(--edulab-accent) 0%, var(--edulab-accent-hover) 100%)', border: 'none', whiteSpace: 'nowrap' }}
                                disabled={createWaiverRequest.isPending}
                              >
                                <Tag size={12} />
                                {createWaiverRequest.isPending ? 'Submitting…' : 'Submit Request'}
                              </button>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccountsFeesPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.ACCOUNTANT, ROLES.PRINCIPAL, ROLES.SYSTEM_ADMIN]}>
      <FeesPageContent />
    </RoleGuard>
  )
}
