'use client'
import type { Guardian } from '../types'

interface Props {
  guardian: Guardian
  isOnlyGuardian: boolean
  onSetPrimary: (id: string) => void
  onEdit: (guardian: Guardian) => void
  onRemove: (id: string) => void
  isLoading?: boolean
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: 'Father',
  mother: 'Mother',
  sibling: 'Sibling',
  uncle: 'Uncle',
  aunt: 'Aunt',
  grandparent: 'Grandparent',
  other: 'Other',
}

export function GuardianCard({ guardian, isOnlyGuardian, onSetPrimary, onEdit, onRemove, isLoading }: Props) {
  const canRemove = !guardian.isPrimaryContact && !isOnlyGuardian
  const removeTitle = isOnlyGuardian
    ? 'Cannot remove — at least one guardian must remain'
    : guardian.isPrimaryContact
    ? 'Set another guardian as primary contact before removing'
    : 'Remove guardian'

  return (
    <div className={`card border mb-3 ${guardian.isPrimaryContact ? 'border-primary shadow-sm' : ''}`}>
      <div className="card-body py-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-semibold">
                {guardian.firstName} {guardian.lastName}
              </span>
              <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                {RELATIONSHIP_LABELS[guardian.relationship] ?? guardian.relationship}
              </span>
              {guardian.isPrimaryContact && (
                <span className="badge bg-primary">
                  <i className="pi pi-star-fill me-1" style={{ fontSize: 10 }} />
                  Primary Contact
                </span>
              )}
            </div>

            <div className="d-flex flex-wrap gap-3 mt-1" style={{ fontSize: 13 }}>
              <span className="text-muted">
                <i className="pi pi-phone me-1" />
                {guardian.phone}
              </span>
              {guardian.email && (
                <span className="text-muted">
                  <i className="pi pi-envelope me-1" />
                  {guardian.email}
                </span>
              )}
              <span className="text-muted">
                <i className="pi pi-id-card me-1" />
                NIC: {guardian.nic}
              </span>
            </div>

            {guardian.address && (
              <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                <i className="pi pi-map-marker me-1" />
                {guardian.address}
              </div>
            )}

            {guardian.idProof && (
              <div className="mt-2">
                <a
                  href={guardian.idProof.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-secondary py-0"
                  style={{ fontSize: 12 }}
                >
                  <i className="pi pi-file me-1" />View ID Proof
                </a>
              </div>
            )}
          </div>

          <div className="d-flex flex-column gap-1" style={{ minWidth: 120 }}>
            {!guardian.isPrimaryContact && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => onSetPrimary(guardian.id)}
                disabled={isLoading}
                title="Set as primary contact"
              >
                <i className="pi pi-star me-1" />Set Primary
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onEdit(guardian)}
              disabled={isLoading}
            >
              <i className="pi pi-pencil me-1" />Edit
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onRemove(guardian.id)}
              disabled={!canRemove || isLoading}
              title={removeTitle}
            >
              <i className="pi pi-trash me-1" />Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
