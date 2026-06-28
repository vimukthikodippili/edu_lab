'use client'
import type { EnrollmentSchemaType } from '../../schemas/enrollmentSchema'

interface Props {
  values: EnrollmentSchemaType
  gradeName: string
  sectionName: string
}

export function ReviewStep({ values, gradeName, sectionName }: Props) {
  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="card border-0 bg-light">
          <div className="card-body">
            <h6 className="fw-bold text-primary mb-3">
              <i className="pi pi-user me-2" />Personal Details
            </h6>
            <dl className="row mb-0">
              <dt className="col-sm-4">Full Name</dt>
              <dd className="col-sm-8">{values.firstName} {values.lastName}</dd>

              <dt className="col-sm-4">Date of Birth</dt>
              <dd className="col-sm-8">{values.dateOfBirth}</dd>

              <dt className="col-sm-4">Gender</dt>
              <dd className="col-sm-8" style={{ textTransform: 'capitalize' }}>{values.gender}</dd>

              {values.address && (
                <>
                  <dt className="col-sm-4">Address</dt>
                  <dd className="col-sm-8">{values.address}</dd>
                </>
              )}

              {values.contactNumber && (
                <>
                  <dt className="col-sm-4">Contact</dt>
                  <dd className="col-sm-8">{values.contactNumber}</dd>
                </>
              )}

              {values.medicalNotes && (
                <>
                  <dt className="col-sm-4">Medical Notes</dt>
                  <dd className="col-sm-8">{values.medicalNotes}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card border-0 bg-light">
          <div className="card-body">
            <h6 className="fw-bold text-primary mb-3">
              <i className="pi pi-book me-2" />Academic Placement
            </h6>
            <dl className="row mb-0">
              <dt className="col-sm-4">Grade</dt>
              <dd className="col-sm-8">{gradeName}</dd>
              <dt className="col-sm-4">Class Section</dt>
              <dd className="col-sm-8">{sectionName}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card border-0 bg-light">
          <div className="card-body">
            <h6 className="fw-bold text-primary mb-3">
              <i className="pi pi-users me-2" />Guardians ({values.guardians.length})
            </h6>
            {values.guardians.map((g, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-top' : ''}>
                <p className="mb-1 fw-semibold">{g.firstName} {g.lastName}</p>
                <small className="text-muted d-block">
                  {g.relationship.charAt(0).toUpperCase() + g.relationship.slice(1)} · {g.nic} · {g.phone}
                  {g.email ? ` · ${g.email}` : ''}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="alert alert-info py-2 d-flex align-items-center gap-2">
          <i className="pi pi-qrcode fs-5" />
          <small>
            A unique admission number and QR code will be auto-generated upon submission.
          </small>
        </div>
      </div>
    </div>
  )
}
