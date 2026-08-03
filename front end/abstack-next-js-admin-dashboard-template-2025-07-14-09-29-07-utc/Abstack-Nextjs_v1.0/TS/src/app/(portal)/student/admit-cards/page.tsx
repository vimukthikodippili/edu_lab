'use client'
import { CreditCard, MapPin, Clock, Armchair } from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useMyAdmitCards } from '@/features/exam-halls/hooks/useMyAdmitCards'
import { EXAM_TYPE_LABELS } from '@/types/sims/exam-halls'

function StudentAdmitCardsContent() {
  const { data: cards, isLoading } = useMyAdmitCards()

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
          <h4 className="mb-0 fw-bold">My Admit Cards</h4>
          <p className="text-muted small mb-0">Your hall and seat assignment for every exam you're registered for.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted small py-3">Loading…</div>
      ) : !cards?.length ? (
        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body text-center text-muted py-5">
            <CreditCard size={36} className="mb-3 opacity-25" />
            <p className="mb-0">No admit cards yet — check back once seats have been allocated.</p>
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

export default function StudentAdmitCardsPage() {
  return (
    <RoleGuard allowedRoles={[ROLES.STUDENT]}>
      <StudentAdmitCardsContent />
    </RoleGuard>
  )
}
