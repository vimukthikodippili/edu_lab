'use client'
import React, { useState } from 'react'
import { BookOpen, Plus, Search, Edit2, Trash2 } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useBooks } from '@/features/library/hooks/useBooks'
import { useCreateBook } from '@/features/library/hooks/useCreateBook'
import { useUpdateBook } from '@/features/library/hooks/useUpdateBook'
import { useDeleteBook } from '@/features/library/hooks/useDeleteBook'
import type { Book } from '@/types/sims/library'

const EMPTY_FORM = { isbn: '', barcode: '', title: '', author: '', subject: '', gradeLevel: '', location: '', totalCopies: 1 }

function StatusBadge({ book }: { book: Book }) {
  if (book.status === 'damaged') return <span className="badge rounded-pill" style={{ background: '#fee2e2', color: '#dc2626', fontSize: '0.7rem' }}>Damaged</span>
  if (book.status === 'lost') return <span className="badge rounded-pill" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem' }}>Lost</span>
  if (book.availableCopies === 0) return <span className="badge rounded-pill" style={{ background: '#fef9c3', color: '#713f12', fontSize: '0.7rem' }}>All Issued</span>
  return <span className="badge rounded-pill" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}>Available ({book.availableCopies}/{book.totalCopies})</span>
}

function BooksCatalogContent() {
  const { showNotification } = useNotificationContext()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: books = [], isLoading } = useBooks(search || undefined)
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()
  const deleteBook = useDeleteBook()

  const setField = (k: keyof typeof EMPTY_FORM, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleOpenAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const handleOpenEdit = (b: Book) => {
    setEditId(b.id)
    setForm({
      isbn: b.isbn,
      barcode: b.barcode,
      title: b.title,
      author: b.author,
      subject: b.subject ?? '',
      gradeLevel: b.gradeLevel ?? '',
      location: b.location ?? '',
      totalCopies: b.totalCopies,
    })
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!form.isbn || !form.barcode || !form.title || !form.author) {
      showNotification({ variant: 'warning', message: 'ISBN, Barcode, Title, and Author are required.' })
      return
    }
    const payload = { ...form, totalCopies: Number(form.totalCopies) }
    if (editId) {
      updateBook.mutate(
        { id: editId, ...payload },
        {
          onSuccess: () => { showNotification({ variant: 'success', message: 'Book updated.' }); setShowForm(false) },
          onError: (e: Error & { response?: { data?: { message?: string } } }) =>
            showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Update failed.' }),
        },
      )
    } else {
      createBook.mutate(payload as Partial<Book>, {
        onSuccess: () => { showNotification({ variant: 'success', message: 'Book added to catalogue.' }); setShowForm(false); setForm(EMPTY_FORM) },
        onError: (e: Error & { response?: { data?: { message?: string } } }) =>
          showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Failed to add book.' }),
      })
    }
  }

  const handleDelete = (b: Book) => {
    if (!window.confirm(`Delete "${b.title}" from catalogue? This cannot be undone.`)) return
    deleteBook.mutate(b.id, {
      onSuccess: () => showNotification({ variant: 'success', message: `"${b.title}" removed.` }),
      onError: (e: Error & { response?: { data?: { message?: string } } }) =>
        showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Delete failed.' }),
    })
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold">Books Catalogue</h4>
            <p className="mb-0 text-muted small">Manage the school library inventory</p>
          </div>
        </div>
        <button className="btn btn-sm fw-semibold text-white d-flex align-items-center gap-1" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }} onClick={handleOpenAdd}>
          <Plus size={14} /> Add Book
        </button>
      </div>

      {/* Search */}
      <div className="mb-3 position-relative" style={{ maxWidth: 400 }}>
        <Search size={14} className="position-absolute text-muted" style={{ left: 10, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="form-control form-control-sm ps-4" placeholder="Search title, author, ISBN…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Inline add/edit form */}
      {showForm && (
        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-header border-0 py-2 px-4 rounded-top-4" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
            <span className="fw-bold text-white small">{editId ? 'Edit Book' : 'Add New Book'}</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {[
                { label: 'Title *', key: 'title' as const },
                { label: 'Author *', key: 'author' as const },
                { label: 'ISBN *', key: 'isbn' as const },
                { label: 'Barcode *', key: 'barcode' as const },
                { label: 'Subject', key: 'subject' as const },
                { label: 'Grade Level', key: 'gradeLevel' as const },
                { label: 'Location (Shelf)', key: 'location' as const },
              ].map(({ label, key }) => (
                <div key={key} className="col-md-4">
                  <label className="form-label small fw-semibold">{label}</label>
                  <input className="form-control form-control-sm" value={String(form[key])} onChange={(e) => setField(key, e.target.value)} />
                </div>
              ))}
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Total Copies</label>
                <input type="number" min={1} className="form-control form-control-sm" value={form.totalCopies} onChange={(e) => setField('totalCopies', Number(e.target.value))} />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-sm fw-semibold text-white" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none' }} onClick={handleSubmit} disabled={createBook.isPending || updateBook.isPending}>
                {editId ? 'Save Changes' : 'Add Book'}
              </button>
              <button className="btn btn-sm btn-outline-secondary fw-semibold" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Books table */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-header border-0 py-3 px-4 rounded-top-4 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <span className="fw-bold text-white d-flex align-items-center gap-2"><BookOpen size={16} /> Book Inventory</span>
          {!isLoading && <span className="badge rounded-pill text-white" style={{ background: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>{books.length} titles</span>}
        </div>
        <div className="card-body p-0">
          {isLoading && (
            <div className="p-4">{[1,2,3].map(i => <div key={i} className="placeholder-glow mb-2"><span className="placeholder col-12 rounded" style={{ height: 40 }} /></div>)}</div>
          )}
          {!isLoading && books.length === 0 && (
            <div className="text-center text-muted py-5">
              <BookOpen size={36} className="mb-3 opacity-50" />
              <p className="fw-semibold mb-1">{search ? 'No books match your search' : 'No books in catalogue yet'}</p>
              <p className="small mb-0">Click "Add Book" to get started.</p>
            </div>
          )}
          {!isLoading && books.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="px-4 py-3 text-muted small fw-semibold border-0">Title / Author</th>
                    <th className="py-3 text-muted small fw-semibold border-0">ISBN / Barcode</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Subject / Grade</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Location</th>
                    <th className="py-3 text-muted small fw-semibold border-0">Status</th>
                    <th className="py-3 text-muted small fw-semibold border-0 px-4">Actions</th>
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
                        <div>{b.isbn}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>BC: {b.barcode}</div>
                      </td>
                      <td className="small">
                        <div>{b.subject ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{b.gradeLevel ?? ''}</div>
                      </td>
                      <td className="small text-muted">{b.location ?? '—'}</td>
                      <td><StatusBadge book={b} /></td>
                      <td className="px-4">
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }} onClick={() => handleOpenEdit(b)}>
                            <Edit2 size={11} /> Edit
                          </button>
                          <button className="btn btn-sm d-flex align-items-center gap-1" style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.75rem' }} onClick={() => handleDelete(b)}>
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
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
  )
}

export default function LibraryBooksPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.LIBRARIAN]}>
      <BooksCatalogContent />
    </RoleGuard>
  )
}
