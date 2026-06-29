'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { subjectSchema } from '../schemas/subjectSchema'
import type { Subject, SubjectCategory, SubjectFormValues } from '../types'
import { CategoryBadge } from './CategoryBadge'
import { useCreateSubject } from '../hooks/useCreateSubject'
import { useUpdateSubject } from '../hooks/useUpdateSubject'

interface Props {
  subject?: Subject | null
  categories: SubjectCategory[]
  onClose: () => void
  onSuccess?: (subject: Subject) => void
}

export function SubjectFormModal({ subject, categories, onClose, onSuccess }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const isEditing = !!subject
  const [serverError, setServerError] = useState<string | null>(null)

  const createSubject = useCreateSubject()
  const updateSubject = useUpdateSubject()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: yupResolver(subjectSchema),
    defaultValues: {
      code: subject?.code ?? '',
      name: subject?.name ?? '',
      description: subject?.description ?? '',
      categoryId: subject?.categoryId ?? (categories[0]?.id ?? 0),
    },
  })

  const watchedCode = watch('code')
  const watchedCategoryId = watch('categoryId')
  const selectedCategory = categories.find((c) => c.id === Number(watchedCategoryId))

  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    el.classList.add('show')
    el.style.display = 'block'
    document.body.classList.add('modal-open')
    return () => {
      el.classList.remove('show')
      el.style.display = 'none'
      document.body.classList.remove('modal-open')
    }
  }, [])

  const onSubmit = async (values: SubjectFormValues) => {
    setServerError(null)
    try {
      let result: Subject
      if (isEditing && subject) {
        result = await updateSubject.mutateAsync({ id: subject.id, ...values })
      } else {
        result = await createSubject.mutateAsync(values)
      }
      onSuccess?.(result)
      onClose()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'An unexpected error occurred.'
      setServerError(Array.isArray(msg) ? msg.join(', ') : msg)
    }
  }

  return (
    <>
      <div
        ref={modalRef}
        className="modal fade"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="subjectModalTitle"
        style={{ display: 'block', zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow-lg border-0 rounded-3 overflow-hidden">
            {/* Header */}
            <div
              className="modal-header text-white border-0 py-3"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <h5 className="modal-title fw-bold" id="subjectModalTitle">
                {isEditing ? 'Edit Subject' : 'New Subject'}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="modal-body p-4">
                {serverError && (
                  <div className="alert alert-danger py-2 rounded-2 mb-3">{serverError}</div>
                )}

                {/* Live preview */}
                {(watchedCode || selectedCategory) && (
                  <div className="d-flex align-items-center gap-2 mb-4 p-3 bg-light rounded-2">
                    <span
                      className="badge bg-dark rounded px-2 py-1"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: 1 }}
                    >
                      {watchedCode?.toUpperCase() || '—'}
                    </span>
                    {selectedCategory && <CategoryBadge category={selectedCategory} size="sm" />}
                  </div>
                )}

                {/* Code */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Subject Code <span className="text-danger">*</span>
                  </label>
                  <input
                    {...register('code')}
                    className={`form-control font-monospace text-uppercase ${errors.code ? 'is-invalid' : ''}`}
                    placeholder="e.g. MAT, SCI-01, ENG-L1"
                    autoFocus
                  />
                  <div className="form-text">Letters, numbers, hyphens, and underscores only</div>
                  {errors.code && (
                    <div className="invalid-feedback">{errors.code.message}</div>
                  )}
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Subject Name <span className="text-danger">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Mathematics, Combined Science"
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name.message}</div>
                  )}
                </div>

                {/* Category */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    {...register('categoryId', { valueAsNumber: true })}
                    className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  >
                    <option value={0} disabled>
                      — Select a category —
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <div className="invalid-feedback">{errors.categoryId.message}</div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    {...register('description')}
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    rows={2}
                    placeholder="Brief description of this subject (optional)"
                  />
                  {errors.description && (
                    <div className="invalid-feedback">{errors.description.message}</div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer border-0 pt-0 pb-4 px-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary px-4" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving…
                    </>
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Create Subject'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1054 }}
      />
    </>
  )
}
