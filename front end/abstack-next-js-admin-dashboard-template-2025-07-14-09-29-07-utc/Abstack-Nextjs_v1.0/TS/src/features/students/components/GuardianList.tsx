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
import { useLinkGuardianAccount } from '../hooks/useLinkGuardianAccount'
import { usePermission } from '@/hooks/usePermission'
import { useNotificationContext } from '@/context/useNotificationContext'

interface Props {
  student: Student
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data
  return data?.message ?? fallback
}

function GuardianAccountLink({ studentId, guardian }: { studentId: string; guardian: Guardian }) {
  const { showNotification } = useNotificationContext()
  const linkAccount = useLinkGuardianAccount(studentId, guardian.id)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLink = () => {
    if (!email.trim()) {
      showNotification({ variant: 'warning', message: 'Enter a login email first.' })
      return
    }
    if (mode === 'new' && password.trim().length < 6) {
      showNotification({ variant: 'warning', message: 'Password must be at least 6 characters.' })
      return
    }
    linkAccount.mutate(
      { email: email.trim(), password: mode === 'new' ? password.trim() : undefined },
      {
        onSuccess: () => {
          showNotification({
            variant: 'success',
            message: mode === 'new' ? 'Login account created and linked.' : 'Portal account linked.',
          })
          setEmail('')
          setPassword('')
        },
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not link that account.') }),
      },
    )
  }

  const handleUnlink = () => {
    linkAccount.mutate(
      { email: null },
      {
        onSuccess: () => showNotification({ variant: 'success', message: 'Portal account unlinked.' }),
        onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err, 'Could not unlink that account.') }),
      },
    )
  }

  return (
    <div className="border-top px-3 py-2 bg-light" style={{ fontSize: 13 }}>
      {guardian.userId ? (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="text-muted">
            <i className="pi pi-id-card me-1 text-success" />
            Portal account linked
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger py-0"
            style={{ fontSize: 12 }}
            onClick={handleUnlink}
            disabled={linkAccount.isPending}
          >
            Unlink
          </button>
        </div>
      ) : (
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted">
              <i className="pi pi-id-card me-1" />
              No portal login linked
            </span>
            <div className="btn-group btn-group-sm" role="group">
              <button
                type="button"
                className={`btn py-0 ${mode === 'existing' ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ fontSize: 12 }}
                onClick={() => setMode('existing')}
              >
                Link existing
              </button>
              <button
                type="button"
                className={`btn py-0 ${mode === 'new' ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ fontSize: 12 }}
                onClick={() => setMode('new')}
              >
                Create new
              </button>
            </div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
            <input
              type="email"
              className="form-control form-control-sm"
              style={{ maxWidth: 220 }}
              placeholder="guardian@sims.edu.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode === 'new' && (
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ maxWidth: 220 }}
                placeholder="Set password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
              onClick={handleLink}
              disabled={linkAccount.isPending}
            >
              {linkAccount.isPending && <span className="spinner-border spinner-border-sm" />}
              {mode === 'new' ? 'Create & Link' : 'Link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
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
          <div
            key={g.id}
            className={`card border mb-3 overflow-hidden ${g.isPrimaryContact ? 'border-primary shadow-sm' : ''}`}
          >
            <GuardianCard
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
            <GuardianAccountLink studentId={student.id} guardian={g} />
          </div>
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
