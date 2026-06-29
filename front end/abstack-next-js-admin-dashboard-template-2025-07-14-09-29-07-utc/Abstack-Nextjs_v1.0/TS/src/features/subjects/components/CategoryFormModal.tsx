'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { categorySchema } from '../schemas/categorySchema'
import type { CategoryFormValues, SubjectCategory } from '../types'
import { useCreateCategory } from '../hooks/useCreateCategory'
import { useUpdateCategory } from '../hooks/useUpdateCategory'

interface Props {
  category?: SubjectCategory | null
  onClose: () => void
  onSuccess?: (category: SubjectCategory) => void
}

const PRESET_COLORS = [
  { color: '#0d6efd', label: 'Core (Blue)' },
  { color: '#198754', label: 'Language (Green)' },
  { color: '#fd7e14', label: 'Optional (Orange)' },
  { color: '#6610f2', label: 'Aesthetics (Purple)' },
  { color: '#0dcaf0', label: 'Science (Cyan)' },
  { color: '#ffc107', label: 'Commerce (Yellow)' },
  { color: '#20c997', label: 'Technology (Teal)' },
  { color: '#dc3545', label: 'Religion (Red)' },
]

export function CategoryFormModal({ category, onClose, onSuccess }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  const isEditing = !!category
  const [serverError, setServerError] = useState<string | null>(null)

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      color: category?.color ?? '#0d6efd',
    },
  })

  const watchedColor = watch('color')
  const watchedName = watch('name')

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

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError(null)
    try {
      let result: SubjectCategory
      if (isEditing && category) {
        result = await updateCategory.mutateAsync({ id: category.id, ...values })
      } else {
        result = await createCategory.mutateAsync(values)
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
        aria-labelledby="categoryModalTitle"
        style={{ display: 'block', zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow-lg border-0 rounded-3 overflow-hidden">
            {/* Header */}
            <div
              className="modal-header text-white border-0 py-3"
              style={{
                background: 'linear-gradient(135deg, #20c997 0%, #0d6efd 100%)',
              }}
            >
              <h5 className="modal-title fw-bold" id="categoryModalTitle">
                {isEditing ? 'Edit Category' : 'New Subject Category'}
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

                {/* Live badge preview */}
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="text-muted small">Preview:</span>
                  <span
                    className="badge rounded-pill px-3 py-1 fw-semibold"
                    style={{ backgroundColor: watchedColor, color: '#fff', fontSize: '0.85rem' }}
                  >
                    {watchedName || 'Category Name'}
                  </span>
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Science, Commerce"
                    autoFocus
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name.message}</div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    {...register('description')}
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    rows={2}
                    placeholder="Brief description (optional)"
                  />
                  {errors.description && (
                    <div className="invalid-feedback">{errors.description.message}</div>
                  )}
                </div>

                {/* Color picker */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Badge Color <span className="text-danger">*</span>
                  </label>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map(({ color, label }) => (
                      <button
                        key={color}
                        type="button"
                        title={label}
                        onClick={() => setValue('color', color, { shouldValidate: true })}
                        className="border-0 p-0 rounded-circle"
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: color,
                          outline:
                            watchedColor === color ? `3px solid ${color}` : '2px solid transparent',
                          outlineOffset: 2,
                          cursor: 'pointer',
                          transition: 'outline 0.15s',
                        }}
                      />
                    ))}
                  </div>
                  <div className="input-group" style={{ maxWidth: 160 }}>
                    <input
                      type="color"
                      className="form-control form-control-color border-end-0"
                      value={watchedColor}
                      onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                      title="Custom color"
                      style={{ minWidth: 44 }}
                    />
                    <input
                      {...register('color')}
                      className={`form-control ${errors.color ? 'is-invalid' : ''}`}
                      placeholder="#000000"
                      value={watchedColor}
                      onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                    />
                  </div>
                  {errors.color && (
                    <div className="text-danger small mt-1">{errors.color.message}</div>
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
                    'Create Category'
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
