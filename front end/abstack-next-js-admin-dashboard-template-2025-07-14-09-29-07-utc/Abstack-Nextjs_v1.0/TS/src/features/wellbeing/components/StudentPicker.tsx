'use client'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useStudents } from '@/features/students/hooks/useStudents'
import { useAllClassSections } from '@/features/attendance/hooks/useAllClassSections'

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

interface Props {
  selectedId: string | null
  onSelect: (id: string, name: string, userId?: number | null) => void
  placeholder?: string
}

export function StudentPicker({ selectedId, onSelect, placeholder }: Props) {
  const [search, setSearch] = useState('')
  const [classSectionId, setClassSectionId] = useState<number | ''>('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const { data: classSections } = useAllClassSections()

  const hasFilter = !!debouncedSearch || !!classSectionId
  const { data, isLoading } = useStudents(
    hasFilter
      ? {
          search: debouncedSearch || undefined,
          classSectionId: classSectionId || undefined,
          limit: debouncedSearch ? 10 : 50,
        }
      : {},
  )

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body py-3">
        <label className="form-label fw-semibold small mb-1">Find a student</label>
        <div className="d-flex gap-2 mb-2 flex-wrap">
          <div className="input-group input-group-sm flex-grow-1" style={{ minWidth: 220 }}>
            <span className="input-group-text bg-white border-end-0">
              <Search size={14} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder={placeholder ?? 'Search by name or admission number…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 220 }}
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All classes</option>
            {classSections?.map((c) => (
              <option key={c.id} value={c.id}>{c.grade.name} · {c.name}</option>
            ))}
          </select>
        </div>

        {isLoading && hasFilter && <p className="text-muted small mb-0">Searching…</p>}

        {!isLoading && hasFilter && (data?.data.length ?? 0) === 0 && (
          <p className="text-muted small mb-0">No students match that search.</p>
        )}

        {!hasFilter && <p className="text-muted small mb-0">Search by name/admission number or pick a class to list students.</p>}

        {hasFilter && !!data?.data.length && (
          <div className="list-group list-group-flush" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {data.data.map((student) => (
              <button
                key={student.id}
                type="button"
                className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${selectedId === student.id ? 'active' : ''}`}
                onClick={() => onSelect(student.id, `${student.firstName} ${student.lastName}`, student.userId)}
              >
                <span className="small">{student.firstName} {student.lastName}</span>
                <span className={`small ${selectedId === student.id ? 'text-white-50' : 'text-muted'}`}>
                  {student.admissionNumber}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
