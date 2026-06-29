'use client'
import { useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import type { EnrollmentSchemaType } from '../../schemas/enrollmentSchema'
import { useGrades } from '../../hooks/useGrades'
import { useClassSections } from '../../hooks/useClassSections'

interface Props {
  form: UseFormReturn<EnrollmentSchemaType>
}

export function AcademicDetailsStep({ form }: Props) {
  const { register, watch, setValue, formState: { errors } } = form
  const selectedGradeId = watch('gradeId')

  const { data: grades = [], isLoading: gradesLoading, isError: gradesError } = useGrades()
  const { data: sections = [], isLoading: sectionsLoading } = useClassSections(
    selectedGradeId > 0 ? selectedGradeId : null,
  )

  // Reset section when grade changes — do NOT trigger validation
  useEffect(() => {
    setValue('classSectionId', undefined as any, { shouldValidate: false, shouldTouch: false, shouldDirty: false })
  }, [selectedGradeId, setValue])

  return (
    <div className="row g-3">
      {gradesError && (
        <div className="col-12">
          <div className="alert alert-warning py-2 d-flex align-items-center gap-2">
            <i className="pi pi-exclamation-triangle" />
            <small>
              Could not load grades — make sure the backend is running on{' '}
              <code>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}</code> and grades have been seeded
              (<code>npm run seed:run:relational</code>).
            </small>
          </div>
        </div>
      )}

      <div className="col-md-6">
        <label className="form-label fw-semibold">
          Grade <span className="text-danger">*</span>
        </label>
        <select
          className={`form-select ${errors.gradeId ? 'is-invalid' : ''}`}
          {...register('gradeId', { valueAsNumber: true })}
          disabled={gradesLoading || gradesError}
          defaultValue=""
        >
          <option value="">
            {gradesLoading ? 'Loading grades…' : '— Select Grade —'}
          </option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {errors.gradeId && (
          <div className="invalid-feedback">{errors.gradeId.message}</div>
        )}
      </div>

      <div className="col-md-6">
        <label className="form-label fw-semibold">
          Class Section <span className="text-danger">*</span>
        </label>
        <select
          className={`form-select ${errors.classSectionId ? 'is-invalid' : ''}`}
          {...register('classSectionId', { valueAsNumber: true })}
          disabled={!selectedGradeId || selectedGradeId === 0 || sectionsLoading}
          defaultValue=""
        >
          <option value="">
            {!selectedGradeId || selectedGradeId === 0
              ? 'Select a grade first'
              : sectionsLoading
                ? 'Loading sections…'
                : '— Select Section —'}
          </option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.classSectionId && (
          <div className="invalid-feedback">{errors.classSectionId.message}</div>
        )}
      </div>

      {selectedGradeId > 0 && grades.length > 0 && (
        <div className="col-12">
          <div className="alert alert-light border d-flex align-items-center gap-2 py-2">
            <i className="pi pi-info-circle text-primary" />
            <small>
              Academic year <strong>{new Date().getFullYear()}</strong> — sections shown are for the current year.
            </small>
          </div>
        </div>
      )}
    </div>
  )
}
