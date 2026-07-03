'use client'
import React from 'react'
import { BookOpen, AlertTriangle, Users, DollarSign, Library, Plus, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useBooks } from '@/features/library/hooks/useBooks'
import { useLoans } from '@/features/library/hooks/useLoans'
import { useFines } from '@/features/library/hooks/useFines'

function LibraryDashboardContent() {
  const { data: books = [] } = useBooks()
  const { data: activeLoans = [] } = useLoans('active')
  const { data: overdueLoans = [] } = useLoans('overdue')
  const { data: unpaidFines = [] } = useFines(false)

  const totalBooks = books.reduce((s, b) => s + b.totalCopies, 0)
  const totalFines = unpaidFines.reduce((s, f) => s + f.fineAmount, 0)

  const stats = [
    { label: 'Total Book Titles', value: books.length, sub: `${totalBooks} copies`, icon: BookOpen, color: '#667eea' },
    { label: 'Active Loans', value: activeLoans.length, sub: 'currently issued', icon: Users, color: '#10b981' },
    { label: 'Overdue', value: overdueLoans.length, sub: 'past due date', icon: AlertTriangle, color: '#f59e0b' },
    { label: 'Unpaid Fines', value: `Rs. ${totalFines.toLocaleString()}`, sub: `${unpaidFines.length} loans`, icon: DollarSign, color: '#ef4444' },
  ]

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
        >
          <Library size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Library Dashboard</h4>
          <p className="mb-0 text-muted small">Manage book inventory, loans, and fines</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, background: `${s.color}20` }}
                >
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <div className="fw-bold fs-5" style={{ color: s.color }}>{s.value}</div>
                  <div className="fw-semibold small">{s.label}</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>{s.sub}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <Link href="/library/issuance" className="text-decoration-none">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ cursor: 'pointer' }}>
              <div className="card-body d-flex align-items-center gap-3 py-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#10b981,#059669)' }}
                >
                  <ClipboardList size={24} color="white" />
                </div>
                <div>
                  <div className="fw-bold">Issue / Return Books</div>
                  <div className="text-muted small">Scan barcode or enter manually to issue or receive books</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-12 col-md-6">
          <Link href="/library/books" className="text-decoration-none">
            <div className="card border-0 shadow-sm rounded-4 h-100" style={{ cursor: 'pointer' }}>
              <div className="card-body d-flex align-items-center gap-3 py-4">
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center"
                  style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}
                >
                  <Plus size={24} color="white" />
                </div>
                <div>
                  <div className="fw-bold">Books Catalogue</div>
                  <div className="text-muted small">Add, edit, and manage physical book inventory</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LibraryDashboard() {
  return (
    <RoleGuard allowedRoles={[ROLES.LIBRARIAN]}>
      <LibraryDashboardContent />
    </RoleGuard>
  )
}
