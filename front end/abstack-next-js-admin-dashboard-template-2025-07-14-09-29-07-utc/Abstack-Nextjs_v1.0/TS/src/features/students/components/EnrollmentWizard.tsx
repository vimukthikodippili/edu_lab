'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useRouter } from 'next/navigation'
import { enrollmentSchema, type EnrollmentSchemaType } from '../schemas/enrollmentSchema'
import { useEnrollStudent } from '../hooks/useEnrollStudent'
import { useGrades } from '../hooks/useGrades'
import { useClassSections } from '../hooks/useClassSections'
import { PersonalDetailsStep } from './steps/PersonalDetailsStep'
import { AcademicDetailsStep } from './steps/AcademicDetailsStep'
import { GuardianStep } from './steps/GuardianStep'
import { ReviewStep } from './steps/ReviewStep'
import { StudentIdCard } from './StudentIdCard'
import type { Student } from '../types'

const STEPS = [
  { id: 1, label: 'Personal Details',     icon: 'pi-user' },
  { id: 2, label: 'Academic Placement',   icon: 'pi-book' },
  { id: 3, label: 'Guardian Information', icon: 'pi-users' },
  { id: 4, label: 'Review & Submit',      icon: 'pi-check-circle' },
]

// Fields that belong to each step — only these are validated when clicking Next
const STEP_FIELDS: Record<number, (keyof EnrollmentSchemaType)[]> = {
  1: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
  2: ['gradeId', 'classSectionId'],
  3: ['guardians'],
}

export function EnrollmentWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [enrolledStudent, setEnrolledStudent] = useState<Student | null>(null)

  const form = useForm<EnrollmentSchemaType>({
    resolver: yupResolver(enrollmentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: undefined,
      address: '',
      contactNumber: '',
      nicNumber: '',
      medicalNotes: '',
      gradeId: undefined as any,
      classSectionId: undefined as any,
      guardians: [{
        firstName: '', lastName: '', relationship: 'father',
        nic: '', phone: '', email: '', address: '',
      }],
    },
    // Only validate when explicitly triggered (Next button click or final submit)
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  const { mutateAsync: enroll, isPending, error } = useEnrollStudent()
  const { data: grades = [] } = useGrades()
  const gradeId = form.watch('gradeId')
  const { data: sections = [] } = useClassSections(gradeId > 0 ? gradeId : null)

  const gradeName   = grades.find((g) => g.id === gradeId)?.name ?? '—'
  const classSectionId = form.watch('classSectionId')
  const sectionName = sections.find((s) => s.id === classSectionId)?.name ?? '—'

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    if (!fields) { setCurrentStep((s) => s + 1); return }

    const isValid = await form.trigger(fields as any)
    if (isValid) {
      // Clear errors so the next step starts clean
      form.clearErrors()
      setCurrentStep((s) => s + 1)
    }
  }

  const goBack = () => {
    form.clearErrors()
    setCurrentStep((s) => s - 1)
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const student = await enroll(data)
      setEnrolledStudent(student)
    } catch {
      // Error is surfaced via the `error` object from useMutation
    }
  })

  // ─── Success screen ─────────────────────────────────────────────────

  if (enrolledStudent) {
    return (
      <div className="text-center py-4">
        <div className="mb-3">
          <i className="pi pi-check-circle text-success" style={{ fontSize: 56 }} />
        </div>
        <h5 className="fw-bold mb-1">Enrollment Successful!</h5>
        <p className="text-muted mb-4">
          {enrolledStudent.firstName} {enrolledStudent.lastName} has been enrolled as{' '}
          <strong>{enrolledStudent.admissionNumber}</strong>.
        </p>

        <div className="d-flex justify-content-center mb-4">
          <StudentIdCard student={enrolledStudent} />
        </div>

        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <button className="btn btn-outline-secondary" onClick={() => router.push('/admin/students')}>
            <i className="pi pi-list me-2" />Back to Student List
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setEnrolledStudent(null); setCurrentStep(1); form.reset() }}
          >
            <i className="pi pi-plus me-2" />Enroll Another Student
          </button>
        </div>
      </div>
    )
  }

  // ─── Wizard ─────────────────────────────────────────────────────────

  return (
    <div>
      {/* Step indicator */}
      <div className="d-flex align-items-center justify-content-between mb-4 position-relative">
        <div className="position-absolute bg-light border"
          style={{ height: 2, top: 20, left: 0, right: 0, zIndex: 0 }} />
        {STEPS.map((step) => {
          const done   = currentStep > step.id
          const active = currentStep === step.id
          return (
            <div key={step.id} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1 }}>
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${
                  done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-white border text-muted'
                }`}
                style={{ width: 40, height: 40, fontWeight: 600, fontSize: 14 }}
              >
                {done
                  ? <i className="pi pi-check" />
                  : <i className={`pi ${step.icon}`} style={{ fontSize: 14 }} />}
              </div>
              <small
                className={`d-none d-md-block text-center ${active ? 'fw-semibold text-primary' : 'text-muted'}`}
                style={{ fontSize: 11, maxWidth: 80 }}
              >
                {step.label}
              </small>
            </div>
          )
        })}
      </div>

      {/* Step heading */}
      <div className="mb-4">
        <h5 className="fw-bold mb-0">{STEPS[currentStep - 1].label}</h5>
        <small className="text-muted">Step {currentStep} of {STEPS.length}</small>
      </div>

      {/* Server error */}
      {error && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="pi pi-exclamation-triangle me-2" />
          {(error as any)?.response?.data?.message ?? error.message}
        </div>
      )}

      {/* Step content */}
      <form onSubmit={onSubmit} noValidate>
        {currentStep === 1 && <PersonalDetailsStep form={form} />}
        {currentStep === 2 && <AcademicDetailsStep form={form} />}
        {currentStep === 3 && <GuardianStep form={form} />}
        {currentStep === 4 && (
          <ReviewStep values={form.getValues()} gradeName={gradeName} sectionName={sectionName} />
        )}

        {/* Navigation */}
        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
          <button type="button" className="btn btn-outline-secondary" onClick={goBack} disabled={currentStep === 1}>
            <i className="pi pi-chevron-left me-2" />Back
          </button>

          {currentStep < STEPS.length ? (
            <button type="button" className="btn btn-primary" onClick={goNext}>
              Next <i className="pi pi-chevron-right ms-2" />
            </button>
          ) : (
            <button type="submit" className="btn btn-success" disabled={isPending}>
              {isPending
                ? <><span className="spinner-border spinner-border-sm me-2" />Enrolling…</>
                : <><i className="pi pi-check me-2" />Confirm Enrollment</>}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
