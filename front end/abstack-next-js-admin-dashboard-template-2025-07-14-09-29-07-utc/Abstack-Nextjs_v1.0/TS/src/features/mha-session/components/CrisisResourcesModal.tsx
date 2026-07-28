'use client'
import { ShieldAlert } from 'lucide-react'
import type { CrisisResource } from '@/types/sims/domain-result'

interface CrisisResourcesModalProps {
  resources: CrisisResource[]
  onClose: () => void
}

export default function CrisisResourcesModal({ resources, onClose }: CrisisResourcesModalProps) {
  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-danger">
              <h5 className="modal-title d-flex align-items-center gap-2 text-danger">
                <ShieldAlert size={20} /> Crisis Resources
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="small text-muted">
                A safety flag has been recorded and the counselor-in-charge and Principal have been notified.
                Share these resources with the student now if appropriate:
              </p>
              {resources.map((resource) => (
                <div
                  key={resource.name}
                  className="mb-2 p-2 rounded border border-danger-subtle bg-danger-subtle bg-opacity-10"
                >
                  <div className="fw-semibold small">{resource.name}</div>
                  <div className="small">{resource.phone}</div>
                  <div className="small text-muted">{resource.description}</div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
