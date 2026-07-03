'use client'
import React, { useState, useRef } from 'react'
import { BookOpen, Upload, ExternalLink, CheckCircle, Trash2, Clock } from 'lucide-react'
import { useNotificationContext } from '@/context/useNotificationContext'
import { useDigitalBooks } from '@/features/library/hooks/useDigitalBooks'
import { useCreateDigitalBook } from '@/features/library/hooks/useCreateDigitalBook'
import { useApproveDigitalBook } from '@/features/library/hooks/useApproveDigitalBook'
import { useDeleteDigitalBook } from '@/features/library/hooks/useDeleteDigitalBook'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import apiClient from '@/lib/api/axios'
import { ENDPOINTS } from '@/lib/api/endpoints'
import type { DigitalBook } from '@/types/sims/library'

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#dbeafe', Science: '#dcfce7', History: '#fef9c3', English: '#fce7f3',
  Geography: '#e0e7ff', Chemistry: '#d1fae5', Physics: '#ede9fe', Biology: '#fef3c7',
}
const subjectColor = (s?: string) => (s && SUBJECT_COLORS[s]) || '#f1f5f9'
const subjectText = (s?: string) => (s && SUBJECT_COLORS[s] ? '#1e40af' : '#475569')

function BookCard({ book, canManage, onApprove, onDelete, approving, deleting }: {
  book: DigitalBook
  canManage: boolean
  onApprove: (id: string) => void
  onDelete: (book: DigitalBook) => void
  approving: boolean
  deleting: boolean
}) {
  const fileUrl = `${process.env.NEXT_PUBLIC_API_URL}/${book.filePath}`

  return (
    <div className="card border-0 shadow-sm rounded-4 h-100" style={{ transition: 'transform .15s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
      <div className="card-body d-flex flex-column p-4">
        {/* Subject badge */}
        <div className="mb-2">
          {book.subject
            ? <span className="badge rounded-pill px-3 py-1" style={{ background: subjectColor(book.subject), color: subjectText(book.subject), fontSize: '0.72rem' }}>{book.subject}</span>
            : <span className="badge rounded-pill px-3 py-1" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem' }}>General</span>
          }
          {!book.isApproved && (
            <span className="badge rounded-pill ms-1 px-2 py-1" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.68rem' }}>Pending</span>
          )}
        </div>

        <div className="fw-bold mb-1" style={{ fontSize: '0.9rem', lineHeight: 1.3 }}>{book.title}</div>
        <div className="text-muted small mb-1">by {book.author}</div>
        {book.description && <div className="text-muted mb-2" style={{ fontSize: '0.75rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{book.description}</div>}

        <div className="mt-auto">
          <div className="text-muted mb-3" style={{ fontSize: '0.7rem' }}>Uploaded by {book.uploaderName} · {new Date(book.createdAt).toLocaleDateString()}</div>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm fw-semibold text-white d-flex align-items-center gap-1"
              style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', fontSize: '0.75rem' }}
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <ExternalLink size={11} /> Read PDF
            </button>
            {canManage && !book.isApproved && (
              <button
                className="btn btn-sm fw-semibold d-flex align-items-center gap-1"
                style={{ background: '#dcfce7', color: '#15803d', border: 'none', fontSize: '0.75rem' }}
                disabled={approving}
                onClick={() => onApprove(book.id)}
              >
                <CheckCircle size={11} /> Approve
              </button>
            )}
            {canManage && (
              <button
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '0.75rem' }}
                disabled={deleting}
                onClick={() => onDelete(book)}
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OnlineLibraryPage() {
  const { showNotification } = useNotificationContext()
  const { user } = useAuthStore()
  const isLibrarianOrAdmin = user?.role === ROLES.LIBRARIAN || user?.role === ROLES.SYSTEM_ADMIN

  // Upload form state
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: allBooks = [], isLoading } = useDigitalBooks(false)
  const createDigitalBook = useCreateDigitalBook()
  const approveDigitalBook = useApproveDigitalBook()
  const deleteDigitalBook = useDeleteDigitalBook()

  const approvedBooks = allBooks.filter((b) => b.isApproved)
  const pendingBooks = allBooks.filter((b) => !b.isApproved)

  const handleUpload = async () => {
    if (!title.trim() || !author.trim() || !pdfFile) {
      showNotification({ variant: 'warning', message: 'Title, Author, and a PDF file are required.' })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', pdfFile)
      const uploadRes = await apiClient.post(ENDPOINTS.FILES.UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const fileId: string = uploadRes.data?.file?.id ?? uploadRes.data?.id
      if (!fileId) throw new Error('Upload did not return a file ID.')

      await createDigitalBook.mutateAsync({
        title: title.trim(),
        author: author.trim(),
        subject: subject.trim() || undefined,
        description: description.trim() || undefined,
        fileId,
      })

      showNotification({
        variant: 'success',
        message: isLibrarianOrAdmin ? 'PDF uploaded and published.' : 'PDF uploaded — pending librarian approval.',
      })
      setTitle(''); setAuthor(''); setSubject(''); setDescription(''); setPdfFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      showNotification({ variant: 'danger', message: err?.response?.data?.message ?? err?.message ?? 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  const handleApprove = (id: string) => {
    approveDigitalBook.mutate(id, {
      onSuccess: () => showNotification({ variant: 'success', message: 'Book approved and published.' }),
      onError: (e: Error & { response?: { data?: { message?: string } } }) =>
        showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Approval failed.' }),
    })
  }

  const handleDelete = (book: DigitalBook) => {
    if (!window.confirm(`Remove "${book.title}" from the digital library? This cannot be undone.`)) return
    deleteDigitalBook.mutate(book.id, {
      onSuccess: () => showNotification({ variant: 'success', message: `"${book.title}" removed.` }),
      onError: (e: Error & { response?: { data?: { message?: string } } }) =>
        showNotification({ variant: 'danger', message: e?.response?.data?.message ?? 'Delete failed.' }),
    })
  }

  return (
    <div className="container-fluid px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <BookOpen size={22} color="white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Online PDF Library</h4>
          <p className="mb-0 text-muted small">Upload and share educational PDFs with the school community</p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="card border-0 shadow-sm rounded-4 mb-5">
        <div className="card-header border-0 py-2 px-4 rounded-top-4 d-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
          <Upload size={15} color="white" />
          <span className="fw-bold text-white small">Share a PDF Book</span>
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Title *</label>
              <input className="form-control form-control-sm" placeholder="Book title…" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Author *</label>
              <input className="form-control form-control-sm" placeholder="Author name…" value={author} onChange={e => setAuthor(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Subject</label>
              <input className="form-control form-control-sm" placeholder="e.g. Mathematics, Science…" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="col-md-8">
              <label className="form-label small fw-semibold">Description</label>
              <input className="form-control form-control-sm" placeholder="Brief description (optional)…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">PDF File *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="form-control form-control-sm"
                onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              />
              {pdfFile && <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>{pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)</div>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 mt-3">
            <button
              className="btn btn-sm fw-semibold text-white d-flex align-items-center gap-2"
              style={{ background: uploading ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}
              onClick={handleUpload}
              disabled={uploading}
            >
              <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload PDF'}
            </button>
            {!isLibrarianOrAdmin && (
              <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                <Clock size={12} /> Uploads require librarian approval before appearing in the library.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pending Approvals — librarian / admin only */}
      {isLibrarianOrAdmin && pendingBooks.length > 0 && (
        <div className="mb-5">
          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <span className="badge rounded-pill" style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.78rem' }}>{pendingBooks.length} Pending</span>
            Awaiting Approval
          </h6>
          <div className="row g-3">
            {pendingBooks.map((book) => (
              <div key={book.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                <BookCard
                  book={book}
                  canManage={isLibrarianOrAdmin}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                  approving={approveDigitalBook.isPending}
                  deleting={deleteDigitalBook.isPending}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse Grid */}
      <div>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <BookOpen size={16} className="text-muted" /> Browse Digital Books
            {!isLoading && <span className="badge rounded-pill bg-primary" style={{ fontSize: '0.72rem' }}>{approvedBooks.length}</span>}
          </h6>
        </div>

        {isLoading && (
          <div className="row g-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="col-12 col-md-6 col-lg-4 col-xl-3">
                <div className="card border-0 shadow-sm rounded-4 placeholder-glow" style={{ height: 180 }}>
                  <div className="card-body"><span className="placeholder col-8 rounded mb-2 d-block" /><span className="placeholder col-6 rounded mb-2 d-block" /><span className="placeholder col-10 rounded d-block" /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && approvedBooks.length === 0 && (
          <div className="text-center py-5 text-muted">
            <BookOpen size={42} className="mb-3 opacity-30" />
            <p className="fw-semibold mb-1">No books yet</p>
            <p className="small">Be the first to upload an educational PDF above.</p>
          </div>
        )}

        {!isLoading && approvedBooks.length > 0 && (
          <div className="row g-3">
            {approvedBooks.map((book) => (
              <div key={book.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                <BookCard
                  book={book}
                  canManage={isLibrarianOrAdmin}
                  onApprove={handleApprove}
                  onDelete={handleDelete}
                  approving={approveDigitalBook.isPending}
                  deleting={deleteDigitalBook.isPending}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
