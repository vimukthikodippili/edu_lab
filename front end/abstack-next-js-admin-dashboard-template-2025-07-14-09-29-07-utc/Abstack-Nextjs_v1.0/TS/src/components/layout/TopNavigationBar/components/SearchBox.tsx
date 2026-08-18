'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, IdCard, BookOpen, SearchX } from 'lucide-react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import useToggle from '@/hooks/useToggle'
import { Card, Modal, ModalDialog } from 'react-bootstrap'
import { useGlobalSearch } from '@/features/search/hooks/useGlobalSearch'
import type { GlobalSearchResult, GlobalSearchResultType } from '@/features/search/types'

const TYPE_ICON: Record<GlobalSearchResultType, typeof GraduationCap> = {
  student: GraduationCap,
  staff: IdCard,
  book: BookOpen,
}
const TYPE_LABEL: Record<GlobalSearchResultType, string> = {
  student: 'Student',
  staff: 'Staff',
  book: 'Book',
}

const SearchBox = () => {
  const { isTrue, toggle } = useToggle()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results = [], isFetching } = useGlobalSearch(debouncedQuery)

  const close = () => {
    toggle()
    setQuery('')
    setDebouncedQuery('')
  }

  const goTo = (result: GlobalSearchResult) => {
    router.push(result.url)
    close()
  }

  return (
    <>
      <div onClick={toggle} className="topbar-search d-none d-xl-flex gap-2 me-2 align-items-center" data-bs-toggle="modal" data-bs-target="#searchModal">
        <IconifyIcon icon="ri:search-line" className="fs-18" />
        <span className="me-2">Search something..</span>
      </div>
      <Modal onHide={close} show={isTrue} className="modal-lg" id="searchModal" tabIndex={-1} aria-labelledby="searchModalLabel" aria-hidden="true">
        <ModalDialog className="m-0">
          <Card className="mb-0">
            <div className="px-3 py-2 d-flex flex-row align-items-center" id="top-search">
              <IconifyIcon icon="ri:search-line" className="fs-22" />
              <input
                type="search"
                className="form-control border-0"
                id="search-modal-input"
                placeholder="Search for students, staff, or library books…"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <a onClick={close} className="btn p-0" aria-label="Close" style={{ cursor: 'pointer' }}>
                [esc]
              </a>
            </div>

            {debouncedQuery.trim().length > 0 && (
              <div style={{ maxHeight: 360, overflowY: 'auto' }} className="border-top">
                {isFetching ? (
                  <div className="text-center text-muted py-4 small">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <SearchX size={24} className="mb-2 opacity-50" />
                    <p className="mb-0 small">No results for &ldquo;{debouncedQuery}&rdquo;.</p>
                  </div>
                ) : (
                  results.map((r) => {
                    const Icon = TYPE_ICON[r.type]
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        type="button"
                        className="btn w-100 d-flex align-items-center gap-3 px-3 py-2 border-0 border-bottom rounded-0 text-start bg-transparent"
                        onClick={() => goTo(r)}
                      >
                        <Icon size={16} className="text-muted flex-shrink-0" />
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="small fw-semibold">{r.label}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{r.sublabel}</div>
                        </div>
                        <span className="badge bg-light text-muted border small">{TYPE_LABEL[r.type]}</span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </Card>
        </ModalDialog>
      </Modal>
    </>
  )
}

export default SearchBox
