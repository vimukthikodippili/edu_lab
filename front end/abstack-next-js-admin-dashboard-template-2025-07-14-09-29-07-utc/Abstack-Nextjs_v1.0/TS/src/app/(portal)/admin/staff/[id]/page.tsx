'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, Calendar, CreditCard, Edit, UserX, ArrowLeft } from 'lucide-react'
import { useStaffMember } from '@/features/staff/hooks/useStaffMember'
import { useDeactivateStaff } from '@/features/staff/hooks/useDeactivateStaff'
import { StaffRoleBadges } from '@/features/staff/components/StaffRoleBadges'
import { QualificationTags } from '@/features/staff/components/QualificationTags'
import { StaffFormModal } from '@/features/staff/components/StaffFormModal'
import type { StaffStatus } from '@/features/staff/types'
import { STAFF_STATUS_LABELS } from '@/features/staff/types'

const STATUS_BADGE: Record<StaffStatus, string> = {
  active: 'bg-success',
  on_leave: 'bg-warning text-dark',
  resigned: 'bg-secondary',
  retired: 'bg-secondary',
}

export default function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: staff, isLoading, isError } = useStaffMember(id)
  const deactivate = useDeactivateStaff()
  const [showEdit, setShowEdit] = useState(false)

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${staff?.firstName} ${staff?.lastName}? This will mark them as resigned.`)) return
    await deactivate.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-3 text-muted">Loading staff profile…</p>
        </div>
      </div>
    )
  }

  if (isError || !staff) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">Staff member not found.</div>
        <Link href="/admin/staff" className="btn btn-outline-secondary">
          <ArrowLeft size={14} className="me-1" /> Back to Directory
        </Link>
      </div>
    )
  }

  const fullName = `${staff.firstName} ${staff.lastName}`
  const hue = (staff.firstName.charCodeAt(0) + staff.lastName.charCodeAt(0)) * 7 % 360

  return (
    <div className="container-fluid py-4">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/admin">Dashboard</Link></li>
          <li className="breadcrumb-item"><Link href="/admin/staff">Staff</Link></li>
          <li className="breadcrumb-item active">{staff.employeeNumber}</li>
        </ol>
      </nav>

      <div className="row g-4">
        {/* ── Left column: Header card ── */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm text-center p-4">
            {staff.photo ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}/api/v1${staff.photo.path}`}
                alt={fullName}
                className="rounded-circle mx-auto mb-3 object-fit-cover"
                style={{ width: 100, height: 100 }}
              />
            ) : (
              <div
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center text-white fw-bold"
                style={{ width: 100, height: 100, background: `hsl(${hue}, 60%, 50%)`, fontSize: 36 }}
              >
                {staff.firstName[0]}{staff.lastName[0]}
              </div>
            )}

            <h5 className="fw-bold mb-1">{fullName}</h5>
            <p className="text-muted small mb-2">{staff.employeeNumber}</p>

            <span className={`badge ${STATUS_BADGE[staff.status]} mb-3`}>
              {STAFF_STATUS_LABELS[staff.status]}
            </span>

            <p className="text-muted small mb-1">{staff.designation}</p>
            <span className="badge bg-light text-dark border">{staff.department}</span>

            {/* Actions — admin/principal only in real app via role check */}
            {staff.status === 'active' && (
              <div className="d-flex gap-2 mt-4 justify-content-center">
                <button
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                  onClick={() => setShowEdit(true)}
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                  onClick={handleDeactivate}
                  disabled={deactivate.isPending}
                >
                  <UserX size={14} />
                  {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: Details ── */}
        <div className="col-lg-8">
          {/* Contact & Personal */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 pb-0">
              <h6 className="fw-bold text-muted text-uppercase small mb-0">Contact & Personal</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded bg-primary bg-opacity-10 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      <Mail size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="small text-muted">Email</div>
                      <div className="fw-medium">{staff.email}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded bg-success bg-opacity-10 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      <Phone size={16} className="text-success" />
                    </div>
                    <div>
                      <div className="small text-muted">Phone</div>
                      <div className="fw-medium">{staff.phone}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded bg-warning bg-opacity-10 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      <CreditCard size={16} className="text-warning" />
                    </div>
                    <div>
                      <div className="small text-muted">NIC</div>
                      <div className="fw-medium">{staff.nicNumber}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="rounded bg-info bg-opacity-10 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36 }}
                    >
                      <Calendar size={16} className="text-info" />
                    </div>
                    <div>
                      <div className="small text-muted">Start Date</div>
                      <div className="fw-medium">
                        {new Date(staff.startDate).toLocaleDateString('en-LK', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                {staff.address && (
                  <div className="col-12">
                    <div className="d-flex align-items-start gap-3">
                      <div
                        className="rounded bg-secondary bg-opacity-10 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 36, height: 36 }}
                      >
                        <MapPin size={16} className="text-secondary" />
                      </div>
                      <div>
                        <div className="small text-muted">Address</div>
                        <div className="fw-medium">{staff.address}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* School Roles */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 pb-0">
              <h6 className="fw-bold text-muted text-uppercase small mb-0">School Roles</h6>
            </div>
            <div className="card-body">
              <StaffRoleBadges roleAssignments={staff.roleAssignments} />
            </div>
          </div>

          {/* Qualifications */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h6 className="fw-bold text-muted text-uppercase small mb-0">Qualifications</h6>
            </div>
            <div className="card-body">
              <QualificationTags mode="display" values={staff.qualifications} />
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <StaffFormModal
          staff={staff}
          onClose={() => setShowEdit(false)}
          onSuccess={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
