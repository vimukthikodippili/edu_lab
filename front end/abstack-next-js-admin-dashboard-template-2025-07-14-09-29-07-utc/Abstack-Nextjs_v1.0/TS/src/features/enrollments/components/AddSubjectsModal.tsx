'use client'
import React, { useState, useMemo } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import { useSubjectCategories } from '@/features/subjects/hooks/useSubjectCategories'
import { useSubjects } from '@/features/subjects/hooks/useSubjects'
import { CategoryBadge } from '@/features/subjects/components/CategoryBadge'
import type { StudentSubjectEnrollment } from '../types'
import { useReplaceEnrollments } from '../hooks/useReplaceEnrollments'

interface Props {
  studentId: string
  enrollments: StudentSubjectEnrollment[]
  onClose: () => void
}

export function AddSubjectsModal({ studentId, enrollments, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: categories = [] } = useSubjectCategories()
  const { data: subjectsPage } = useSubjects({ limit: 200 })
  const replace = useReplaceEnrollments(studentId)

  const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.subjectId)), [enrollments])

  const available = useMemo(() => {
    return (subjectsPage?.data ?? []).filter((s) => {
      if (enrolledIds.has(s.id)) return false
      if (categoryFilter && s.categoryId !== categoryFilter) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [subjectsPage, enrolledIds, search, categoryFilter])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) return
    const allIds = [...enrolledIds, ...selected]
    await replace.mutateAsync({ subjectIds: allIds })
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1055,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3 shadow-lg" style={{ width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          className="d-flex align-items-center justify-content-between p-4 rounded-top-3"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="d-flex align-items-center gap-2 text-white">
            <BookOpen size={20} />
            <span className="fw-semibold fs-5">Add Subjects</span>
          </div>
          <button className="btn btn-sm btn-link text-white p-0" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 border-bottom d-flex gap-2">
          <div className="input-group input-group-sm flex-grow-1">
            <span className="input-group-text bg-transparent border-end-0">
              <Search size={14} className="text-muted" />
            </span>
            <input
              className="form-control border-start-0"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm"
            style={{ width: 160 }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="overflow-auto flex-grow-1 p-2">
          {available.length === 0 ? (
            <div className="text-center text-muted py-5">
              <BookOpen size={32} className="mb-2 opacity-50" />
              <p className="mb-0 small">
                {enrolledIds.size > 0 && (subjectsPage?.data ?? []).every((s) => enrolledIds.has(s.id))
                  ? 'All available subjects are already enrolled'
                  : 'No subjects match your search'}
              </p>
            </div>
          ) : (
            <ul className="list-unstyled mb-0">
              {available.map((s) => (
                <li key={s.id} className="d-flex align-items-center gap-3 px-2 py-2 rounded-2 hover-bg-light">
                  <input
                    type="checkbox"
                    className="form-check-input mt-0"
                    style={{ cursor: 'pointer' }}
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    id={`subj-${s.id}`}
                  />
                  <label htmlFor={`subj-${s.id}`} className="d-flex align-items-center gap-2 flex-grow-1 mb-0" style={{ cursor: 'pointer' }}>
                    <code className="badge bg-dark-subtle text-dark fw-semibold" style={{ fontSize: '0.72rem' }}>
                      {s.code}
                    </code>
                    <span className="flex-grow-1 small fw-medium">{s.name}</span>
                    <CategoryBadge category={s.category} size="sm" />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-top d-flex justify-content-between align-items-center">
          <span className="small text-muted">
            {selected.size > 0 ? `${selected.size} selected` : 'Select subjects to add'}
          </span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-sm btn-primary"
              disabled={selected.size === 0 || replace.isPending}
              onClick={handleAdd}
            >
              {replace.isPending ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : null}
              Add Selected ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
