'use client'
import { useEffect, useState } from 'react'
import { CreditCard, MapPin, Clock, Armchair } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyGuardianProfile } from '@/features/students/hooks/useMyGuardianProfile'
import { useChildAdmitCards } from '@/features/exam-halls/hooks/useChildAdmitCards'
import { EXAM_TYPE_LABELS } from '@/types/sims/exam-halls'

function GuardianAdmitCardsContent() {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyGuardianProfile()
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId && profile?.students.length) {
      setStudentId(profile.students[0].id)
    }
  }, [profile, studentId])

  const { data: cards, isLoading: cardsLoading } = useChildAdmitCards(studentId)

  if (profileLoading) {
    return <div className="container-fluid py-4" style={{ maxWidth: 800 }}><div className="text-muted small">Loading…</div></div>
  }

  if (profileError || !profile) {
    return (
      <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
        <div className="alert alert-warning">Your account is not yet linked to a guardian record. Please contact your school administrator.</div>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <CreditCard size={22} className="text-white" />
        </div>
        <div>
          <h4 className="mb-0 fw-bold">Admit Cards</h4>
          <p className="text-muted small mb-0">Your child's hall and seat assignment for every exam.</p>
        </div>
      </div>

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

      {cardsLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !cards?.length ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <CreditCard size={36} className="mb-3 opacity-25" />
            <p className="mb-0">No admit cards yet for this child.</p>
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {cards.map((card) => (
            <div key={card.admitCard.id} className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <span className="badge rounded-pill px-2 mb-2" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
                  {EXAM_TYPE_LABELS[card.exam.examType]}
                </span>
                <h6 className="fw-bold mb-2">{card.exam.name}</h6>
                <div className="d-flex flex-wrap gap-3 small text-muted mb-3">
                  <span className="d-flex align-items-center gap-1"><Clock size={13} /> {card.exam.date} · {card.exam.startTime}–{card.exam.endTime}</span>
                  <span className="d-flex align-items-center gap-1"><MapPin size={13} /> {card.hallName}</span>
                </div>
                <div className="d-flex align-items-center gap-2 p-3 rounded-3" style={{ background: '#f8fafc' }}>
                  <Armchair size={20} className="text-primary" />
                  <div>
                    <div className="text-muted small">Seat Number</div>
                    <div className="fw-bold fs-5">{card.seatLabel}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GuardianAdmitCardsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.GUARDIAN]}>
      <GuardianAdmitCardsContent />
    </RoleGuard>
  )
}
