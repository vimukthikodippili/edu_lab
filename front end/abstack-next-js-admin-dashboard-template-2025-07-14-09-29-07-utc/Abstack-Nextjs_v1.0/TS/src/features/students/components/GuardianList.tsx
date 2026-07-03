'use client'
import { useState } from 'react'
import type { Guardian, Student, AddGuardianPayload } from '../types'
import { GuardianCard } from './GuardianCard'
import { GuardianFormModal } from './GuardianFormModal'
import { BiometricEnrollModal } from './BiometricEnrollModal'
import { useAddGuardian } from '../hooks/useAddGuardian'
import { useUpdateGuardian } from '../hooks/useUpdateGuardian'
import { useRemoveGuardian } from '../hooks/useRemoveGuardian'
import { useSetPrimaryGuardian } from '../hooks/useSetPrimaryGuardian'
import { usePermission } from '@/hooks/usePermission'

interface Props {
  student: Student
}

type ModalState =
  | { type: 'closed' }
  | { type: 'add' }
  | { type: 'edit'; guardian: Guardian }
  | { type: 'biometric'; guardian: Guardian }

export function GuardianList({ student }: Props) {
  const [modal, setModal] = useState<ModalState>({ type: 'closed' })
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const canEnroll = usePermission('biometric:enroll')

  const addGuardian = useAddGuardian(student.id)
  const updateGuardian = useUpdateGuardian(student.id)
  const removeGuardian = useRemoveGuardian(student.id)
  const setPrimaryGuardian = useSetPrimaryGuardian(student.id)

  const isAnyLoading =
    addGuardian.isPending || updateGuardian.isPending ||
    removeGuardian.isPending || setPrimaryGuardian.isPending

  const handleSubmit = (payload: AddGuardianPayload) => {
    if (modal.type === 'add') {
      addGuardian.mutate(payload, { onSuccess: () => setModal({ type: 'closed' }) })
    } else if (modal.type === 'edit') {
      updateGuardian.mutate(
        { guardianId: modal.guardian.id, payload },
        { onSuccess: () => setModal({ type: 'closed' }) },
      )
    }
  }

  const handleConfirmRemove = () => {
    if (!confirmRemoveId) return
    removeGuardian.mutate(confirmRemoveId, { onSuccess: () => setConfirmRemoveId(null) })
  }

  const apiError =
    (addGuardian.error?.message) ||
    (updateGuardian.error?.message) ||
    (removeGuardian.error?.message) ||
    (setPrimaryGuardian.error?.message)

  return (
    <div>
      {/* Error banner */}
      {apiError && (
        <div className="alert alert-danger py-2 mb-3">
          <i className="pi pi-exclamation-triangle me-2" />
          {apiError}
        </div>
      )}

      {/* Guardian cards */}
      {student.guardians.length === 0 ? (
        <div className="text-center text-muted py-4">
          <i className="pi pi-users fs-3 d-block mb-2" />
          No guardians linked. Add at least one guardian.
        </div>
      ) : (
        student.guardians.map((g) => (
          <GuardianCard
            key={g.id}
            guardian={g}
            isOnlyGuardian={student.guardians.length === 1}
            onSetPrimary={(id) => setPrimaryGuardian.mutate(id)}
            onEdit={(guardian) => setModal({ type: 'edit', guardian })}
            onRemove={(id) => setConfirmRemoveId(id)}
            onEnroll={(id) => {
              const guardian = student.guardians.find((g) => g.id === id)
              if (guardian) setModal({ type: 'biometric', guardian })
            }}
            canEnroll={canEnroll}
            isLoading={isAnyLoading}
          />
        ))
      )}

      {/* Add guardian button */}
      {student.guardians.length < 5 ? (
        <button
          type="button"
          className="btn btn-outline-primary w-100 mt-1"
          onClick={() => setModal({ type: 'add' })}
          disabled={isAnyLoading}
        >
          <i className="pi pi-plus me-2" />Add Guardian
        </button>
      ) : (
        <div className="alert alert-info py-2 text-center mt-1">
          <i className="pi pi-info-circle me-2" />
          Maximum of 5 guardians reached.
        </div>
      )}

      {/* Add / Edit modal */}
      <GuardianFormModal
        guardian={modal.type === 'edit' ? modal.guardian : null}
        isOnlyGuardian={student.guardians.length <= 1}
        isOpen={modal.type === 'add' || modal.type === 'edit'}
        isSubmitting={addGuardian.isPending || updateGuardian.isPending}
        onClose={() => setModal({ type: 'closed' })}
        onSubmit={handleSubmit}
      />

      {/* Biometric enroll modal */}
      {modal.type === 'biometric' && (
        <BiometricEnrollModal
          isOpen
          guardian={modal.guardian}
          studentId={student.id}
          onClose={() => setModal({ type: 'closed' })}
        />
      )}

      {/* Confirm remove dialog */}
      {confirmRemoveId && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Remove Guardian</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setConfirmRemoveId(null)}
                    disabled={removeGuardian.isPending}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to remove this guardian? This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmRemoveId(null)}
                    disabled={removeGuardian.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmRemove}
                    disabled={removeGuardian.isPending}
                  >
                    {removeGuardian.isPending && <span className="spinner-border spinner-border-sm me-2" />}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
