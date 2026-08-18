'use client'
import { useEffect, useState, type ElementType } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Cake,
  Phone,
  MapPin,
  HeartPulse,
  BadgeCheck,
  BarChart2,
  Heart,
  ListChecks,
  FlaskConical,
  Trophy,
  CalendarClock,
  User,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import type { Student } from '@/features/students/types'

interface QuickLink {
  label: string
  icon: ElementType
  href: string
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Grades', icon: BarChart2, href: '/guardian/grades' },
  { label: 'Wellbeing Updates', icon: Heart, href: '/guardian/wellbeing' },
  { label: 'Homework & Assignments', icon: ListChecks, href: '/guardian/assignments' },
  { label: 'Lab Reports', icon: FlaskConical, href: '/guardian/lab-reports' },
  { label: 'Sports Performance', icon: Trophy, href: '/guardian/sports' },
  { label: 'Parent-Teacher Meetings', icon: CalendarClock, href: '/guardian/ptm' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function ChildDetailCard({ student }: { student: Student }) {
  return (
    <div className="card border-0 shadow-sm mb-4">
      <div
        className="card-header border-0 py-3 px-4 rounded-top-3 d-flex align-items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div
          className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center overflow-hidden flex-shrink-0"
          style={{ width: 56, height: 56 }}
        >
          {student.photo ? (
            <Image
              src={student.photo.path}
              alt={`${student.firstName} ${student.lastName}`}
              width={56}
              height={56}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <User size={26} className="text-white" />
          )}
        </div>
        <div>
          <div className="fw-bold text-white fs-5">{student.firstName} {student.lastName}</div>
          <div className="text-white small" style={{ opacity: 0.9 }}>
            {student.grade.name} — Section {student.classSection.name}
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="text-muted small d-flex align-items-center gap-1 mb-1">
              <BadgeCheck size={13} /> Admission No.
            </div>
            <div className="fw-semibold small">{student.admissionNumber}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-muted small d-flex align-items-center gap-1 mb-1">
              <Cake size={13} /> Date of Birth
            </div>
            <div className="fw-semibold small">{formatDate(student.dateOfBirth)}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-muted small d-flex align-items-center gap-1 mb-1">
              <Phone size={13} /> Contact
            </div>
            <div className="fw-semibold small">{student.contactNumber ?? '—'}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-muted small d-flex align-items-center gap-1 mb-1">
              <MapPin size={13} /> Address
            </div>
            <div className="fw-semibold small">{student.address ?? '—'}</div>
          </div>
        </div>

        {student.medicalNotes && (
          <div className="mt-3 p-3 rounded-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div className="d-flex align-items-center gap-2 fw-semibold small mb-1" style={{ color: '#9a3412' }}>
              <HeartPulse size={14} /> Medical Notes
            </div>
            <div className="small" style={{ color: '#9a3412' }}>{student.medicalNotes}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function GuardianChildrenContent() {
  const { data: profile, isLoading, error } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  const selectedStudent = profile?.students.find((s) => s.id === studentId)

  if (isLoading) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-4 rounded mb-2 d-block" style={{ height: 40 }} />
          <span className="placeholder col-12 rounded" style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container-fluid px-4 py-4">
        <div className="alert alert-warning">
          Your account is not yet linked to a guardian record. Please contact your school administrator.
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <Users size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">My Children</h4>
          <p className="text-muted small mb-0">Profile and quick links for each of your children.</p>
        </div>
      </div>

      {profile.students.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            <Users size={36} className="mb-3 opacity-25" />
            <p className="fw-semibold mb-1">No children linked yet</p>
            <p className="small mb-0">Contact your school administrator to link a student to your account.</p>
          </div>
        </div>
      ) : (
        <>
          {profile.students.length > 1 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <label className="form-label fw-semibold small mb-2">Child</label>
                <div className="d-flex gap-2 flex-wrap">
                  {profile.students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn btn-sm ${studentId === s.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setStudentId(s.id)}
                    >
                      {s.firstName} {s.lastName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedStudent && <ChildDetailCard student={selectedStudent} />}

          <div className="card border-0 shadow-sm">
            <div
              className="card-header border-0 py-3 px-4 rounded-top-3"
              style={{ background: 'linear-gradient(135deg, var(--edulab-nav-bg) 0%, var(--edulab-nav-bg-2) 100%)' }}
            >
              <span className="fw-bold text-white">Quick Links</span>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {QUICK_LINKS.map((l) => (
                  <div key={l.label} className="col-6 col-md-4 col-lg-3">
                    <Link
                      href={l.href}
                      className="d-flex align-items-center gap-2 p-3 rounded-3 text-decoration-none h-100"
                      style={{ background: '#f8fafc', color: 'var(--edulab-ink)', border: '1px solid var(--edulab-border)' }}
                    >
                      <l.icon size={16} style={{ color: 'var(--edulab-accent)' }} className="flex-shrink-0" />
                      <span className="fw-semibold small">{l.label}</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function GuardianChildrenPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianChildrenContent />
    </RoleGuard>
  )
}
