'use client'
import React, { useState } from 'react'
import { AlertTriangle, BookOpen, CalendarClock, Search } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useAuthStore } from '@/stores/authStore'
import { useBooks } from '@/features/library/hooks/useBooks'
import { useMyLibraryLoans } from '@/features/library/hooks/useMyLibraryLoans'
import type { Book, MyLibraryLoan } from '@/types/sims/library'

function StatusBadge({ book }: { book: Book }) {
  if (book.status === 'damaged') return <span className="badge rounded-pill" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}>Damaged</span>
  if (book.status === 'lost') return <span className="badge rounded-pill" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>Lost</span>
  if (book.availableCopies === 0) return <span className="badge rounded-pill" style={{ background: '#fef9c3', color: '#713f12', fontSize: '0.7rem' }}>All Issued</span>
  return <span className="badge rounded-pill" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}>Available ({book.availableCopies}/{book.totalCopies})</span>
}

function LoanStatusBadge({ loan }: { loan: MyLibraryLoan }) {
  if (loan.status === 'returned') return <span className="badge rounded-pill" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem' }}>Returned</span>
  if (loan.daysOverdue > 0) return <span className="badge rounded-pill d-flex align-items-center gap-1" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', width: 'fit-content' }}><AlertTriangle size={10} /> {loan.daysOverdue}d overdue</span>
  return <span className="badge rounded-pill" style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.7rem' }}>Issued</span>
}

function MyIssuedBooksPanel() {
  const { data: loans = [], isLoading } = useMyLibraryLoans()
  const active = loans.filter((l) => l.status !== 'returned')

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center justify-content-between"
        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
      >
        <span className="fw-bold text-white d-flex align-items-center gap-2">
          <CalendarClock size={16} /> My Issued Books
        </span>
        {!isLoading && (
          <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>
            {active.length}
          </span>
        )}
      </div>
      <div className="card-body p-0">
        {isLoading && (
          <div className="p-4">
            <div className="placeholder-glow"><span className="placeholder col-12 rounded" style={{ height: 32 }} /></div>
          </div>
        )}
        {!isLoading && active.length === 0 && (
          <div className="text-center text-muted py-4">
            <BookOpen size={30} className="mb-2 opacity-25" />
            <p className="mb-0 small">You have no books currently issued.</p>
          </div>
        )}
        {!isLoading && active.length > 0 && (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="px-4 py-2 text-muted small fw-semibold border-0">Book</th>
                  <th className="py-2 text-muted small fw-semibold border-0">Due Date</th>
                  <th className="py-2 text-muted small fw-semibold border-0 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {active.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-4 small fw-semibold">{loan.bookTitle}</td>
                    <td className="small text-muted">{new Date(loan.dueAt).toLocaleDateString()}</td>
                    <td className="px-4"><LoanStatusBadge loan={loan} /></td>
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

function BooksCatalogueContent() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const { data: books = [], isLoading } = useBooks(search || undefined)

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <BookOpen size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Books Catalogue</h4>
          <p className="mb-0 text-muted small">Search and browse the school library&apos;s book collection</p>
        </div>
      </div>

      {(user?.role === ROLES.STUDENT || user?.role === ROLES.TEACHER) && <MyIssuedBooksPanel />}

      {/* Search */}
      <div className="mb-3 position-relative" style={{ maxWidth: 400 }}>
        <Search size={14} className="position-absolute text-muted" style={{ left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="form-control form-control-sm ps-4" placeholder="Search title, author, ISBN…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Books table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <span className="fw-bold text-white d-flex align-items-center gap-2"><BookOpen size={16} /> Book Catalogue</span>
          {!isLoading && <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>{books.length} titles</span>}
        </div>
        <div className="card-body p-0">
          {isLoading && (
            <div className="p-4">{[1, 2, 3].map((i) => <div key={i} className="placeholder-glow mb-2"><span className="placeholder col-12 rounded" style={{ height: 40 }} /></div>)}</div>
          )}
          {!isLoading && books.length === 0 && (
            <div className="text-center text-muted py-5">
              <BookOpen size={36} className="mb-3 opacity-50" />
              <p className="fw-semibold mb-1">{search ? 'No books match your search' : 'No books in the catalogue yet'}</p>
            </div>
          )}
          {!isLoading && books.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">Title / Author</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Subject / Grade</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Location</th>
                    <th className="py-3 text-muted small fw-semibold border-0 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4">
                        <div className="fw-semibold small">{b.title}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{b.author}</div>
                      </td>
                      <td className="small">
                        <div>{b.subject ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{b.gradeLevel ?? ''}</div>
                      </td>
                      <td className="small text-muted">{b.location ?? '—'}</td>
                      <td className="px-4"><StatusBadge book={b} /></td>
                    </tr>
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

export default function LibraryCataloguePage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT, ROLES.TEACHER]}>
      <BooksCatalogueContent />
    </RoleGuard>
  )
}
