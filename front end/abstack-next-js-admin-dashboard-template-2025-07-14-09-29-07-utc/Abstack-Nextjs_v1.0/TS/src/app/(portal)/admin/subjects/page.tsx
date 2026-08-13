'use client'
import { useState } from 'react'
import { Pencil, Plus, Power, BookOpen, AlertCircle } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useSubjectCategories } from '@/features/subjects/hooks/useSubjectCategories'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { useToggleCategoryStatus } from '@/features/subjects/hooks/useToggleCategoryStatus'
import { useToggleSubjectStatus } from '@/features/subjects/hooks/useToggleSubjectStatus'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import { CategoryFormModal } from '@/features/subjects/components/CategoryFormModal'
import { SubjectFormModal } from '@/features/subjects/components/SubjectFormModal'
import type { Subject, SubjectCategory } from '@/features/subjects/types'

type ModalState =
  | 'closed'
  | 'addCategory'
  | 'editCategory'
  | 'addSubject'
  | 'editSubject'

function SubjectsContent() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [modal, setModal] = useState<ModalState>('closed')
  const [editCategory, setEditCategory] = useState<SubjectCategory | null>(null)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)
  const [page, setPage] = useState(1)

  // Data
  const { data: categories = [], isLoading: catsLoading } = useSubjectCategories(true)
  const { data: subjectsData, isLoading: subsLoading } = useSubjects({
    page,
    limit: 20,
    search: search || undefined,
    categoryId: selectedCategoryId ?? undefined,
    includeInactive,
  })

  const toggleCategory = useToggleCategoryStatus()
  const toggleSubject = useToggleSubjectStatus()

  const subjects = subjectsData?.data ?? []
  const total = subjectsData?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const activeCategories = categories.filter((c) => c.isActive)

  const handleCategoryClick = (id: number) => {
    setSelectedCategoryId((prev) => (prev === id ? null : id))
    setPage(1)
  }

  const handleDeactivateCategory = async (cat: SubjectCategory) => {
    if (
      !window.confirm(
        `Deactivate "${cat.name}"? All active subjects in this category must be deactivated first.`,
      )
    )
      return
    try {
      await toggleCategory.mutateAsync({ id: cat.id, activate: false })
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors?.categoryId ??
        err?.response?.data?.message ??
        'Failed to deactivate category.'
      alert(msg)
    }
  }

  const handleToggleSubject = async (subject: Subject) => {
    if (!subject.isActive) {
      await toggleSubject.mutateAsync({ id: subject.id, activate: true })
      return
    }
    if (
      !window.confirm(
        `Deactivate "${subject.name}"? The subject will be hidden from active lists but history is preserved.`,
      )
    )
      return
    await toggleSubject.mutateAsync({ id: subject.id, activate: false })
  }

  const openEditCategory = (cat: SubjectCategory) => {
    setEditCategory(cat)
    setModal('editCategory')
  }

  const openEditSubject = (sub: Subject) => {
    setEditSubject(sub)
    setModal('editSubject')
  }

  const closeModal = () => {
    setModal('closed')
    setEditCategory(null)
    setEditSubject(null)
  }

  return (
    <div className="container-fluid py-4">
      {/* Page header */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <BookOpen size={22} className="text-primary" />
        <div>
          <h4 className="mb-0 fw-bold">Academic Setup — Subjects</h4>
          <p className="mb-0 text-muted small">
            Define and manage the school&apos;s subject list and categories
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* ── LEFT PANEL: Categories ─────────────────────────────────── */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
              <span className="fw-semibold text-uppercase small text-muted ls-1">
                Subject Categories
              </span>
              <button
                className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                onClick={() => setModal('addCategory')}
              >
                <Plus size={14} />
                New
              </button>
            </div>
            <div className="card-body p-0">
              {catsLoading ? (
                <div className="p-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="placeholder-glow mb-3">
                      <span className="placeholder rounded-2 w-100" style={{ height: 36 }} />
                    </div>
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <AlertCircle size={32} className="mb-2 opacity-50" />
                  <p className="small">No categories yet</p>
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id
                    return (
                      <li
                        key={cat.id}
                        className={`d-flex align-items-center gap-2 px-3 py-2 border-bottom cursor-pointer
                          ${isSelected ? 'bg-primary bg-opacity-10' : ''}
                          ${!cat.isActive ? 'opacity-50' : ''}
                        `}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => handleCategoryClick(cat.id)}
                      >
                        {/* Color dot */}
                        <span
                          className="rounded-circle flex-shrink-0"
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: cat.isActive ? cat.color : '#adb5bd',
                            display: 'inline-block',
                          }}
                        />
                        {/* Name */}
                        <span
                          className={`flex-grow-1 small fw-semibold ${isSelected ? 'text-primary' : ''}`}
                        >
                          {cat.name}
                        </span>
                        {!cat.isActive && (
                          <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.65rem' }}>
                            Inactive
                          </span>
                        )}
                        {/* Actions */}
                        <div
                          className="d-flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="btn btn-sm p-1 text-muted"
                            title="Edit category"
                            onClick={() => openEditCategory(cat)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className={`btn btn-sm p-1 ${cat.isActive ? 'text-warning' : 'text-success'}`}
                            title={cat.isActive ? 'Deactivate' : 'Reactivate'}
                            onClick={() =>
                              cat.isActive
                                ? handleDeactivateCategory(cat)
                                : toggleCategory.mutate({ id: cat.id, activate: true })
                            }
                          >
                            <Power size={13} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Subjects ──────────────────────────────────── */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            {/* Filter bar */}
            <div className="card-header bg-white border-bottom py-3">
              <div className="row g-2 align-items-center">
                <div className="col-sm-5">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search by name or code…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                  />
                </div>
                <div className="col-sm-3">
                  <select
                    className="form-select form-select-sm"
                    value={selectedCategoryId ?? ''}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)
                      setPage(1)
                    }}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-sm-2">
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="showInactive"
                      checked={includeInactive}
                      onChange={(e) => {
                        setIncludeInactive(e.target.checked)
                        setPage(1)
                      }}
                    />
                    <label className="form-check-label small" htmlFor="showInactive">
                      Show inactive
                    </label>
                  </div>
                </div>
                <div className="col-sm-2 text-end">
                  <button
                    className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                    onClick={() => setModal('addSubject')}
                  >
                    <Plus size={14} />
                    Subject
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-uppercase small text-muted fw-semibold ps-3" style={{ width: 90 }}>Code</th>
                    <th className="text-uppercase small text-muted fw-semibold">Name</th>
                    <th className="text-uppercase small text-muted fw-semibold">Category</th>
                    <th className="text-uppercase small text-muted fw-semibold">Status</th>
                    <th className="text-uppercase small text-muted fw-semibold pe-3" style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(5)].map((__, j) => (
                          <td key={j}>
                            <span className="placeholder-glow d-block">
                              <span className="placeholder rounded w-75" style={{ height: 16 }} />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : subjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        <BookOpen size={32} className="mb-2 opacity-30" />
                        <p className="small mb-0">
                          {search || selectedCategoryId
                            ? 'No subjects match your filters'
                            : 'No subjects yet — click "+ Subject" to add one'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub) => (
                      <tr key={sub.id} className={!sub.isActive ? 'opacity-60' : ''}>
                        <td className="ps-3">
                          <span
                            className="badge bg-dark rounded px-2 py-1"
                            style={{ fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: 1 }}
                          >
                            {sub.code}
                          </span>
                        </td>
                        <td>
                          <span className="fw-semibold small">{sub.name}</span>
                          {sub.description && (
                            <p className="text-muted mb-0" style={{ fontSize: '0.72rem' }}>
                              {sub.description}
                            </p>
                          )}
                        </td>
                        <td>
                          {sub.category && <CategoryBadge category={sub.category} size="sm" />}
                        </td>
                        <td>
                          {sub.isActive ? (
                            <span className="badge bg-success-subtle text-success rounded-pill px-2 py-1" style={{ fontSize: '0.72rem' }}>
                              Active
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1" style={{ fontSize: '0.72rem' }}>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="pe-3">
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm p-1 text-primary"
                              title="Edit subject"
                              onClick={() => openEditSubject(sub)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={`btn btn-sm p-1 ${sub.isActive ? 'text-warning' : 'text-success'}`}
                              title={sub.isActive ? 'Deactivate' : 'Reactivate'}
                              onClick={() => handleToggleSubject(sub)}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center py-2 px-3">
                <small className="text-muted">
                  {total} subject{total !== 1 ? 's' : ''}
                </small>
                <nav>
                  <ul className="pagination pagination-sm mb-0 gap-1">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link rounded" onClick={() => setPage((p) => p - 1)}>
                        &lsaquo;
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, i) => (
                      <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                        <button className="page-link rounded" onClick={() => setPage(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link rounded" onClick={() => setPage((p) => p + 1)}>
                        &rsaquo;
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal === 'addCategory' && (
        <CategoryFormModal onClose={closeModal} />
      )}
      {modal === 'editCategory' && editCategory && (
        <CategoryFormModal category={editCategory} onClose={closeModal} />
      )}
      {modal === 'addSubject' && (
        <SubjectFormModal categories={activeCategories} onClose={closeModal} />
      )}
      {modal === 'editSubject' && editSubject && (
        <SubjectFormModal
          subject={editSubject}
          categories={activeCategories}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

export default function SubjectsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <SubjectsContent />
    </RoleGuard>
  )
}
