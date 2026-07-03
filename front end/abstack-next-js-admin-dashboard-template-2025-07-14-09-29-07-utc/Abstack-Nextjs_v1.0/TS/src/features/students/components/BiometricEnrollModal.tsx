'use client'
import { useState } from 'react'
import type { Guardian } from '../types'
import { useRecordConsent } from '../hooks/useRecordConsent'
import { useEnrollBiometric } from '../hooks/useEnrollBiometric'

type CaptureState = 'idle' | 'scanning' | 'captured'

interface Props {
  isOpen: boolean
  guardian: Guardian
  studentId: string
  onClose: () => void
}

export function BiometricEnrollModal({ isOpen, guardian, studentId, onClose }: Props) {
  const [step, setStep] = useState<'consent' | 'capture'>('consent')
  const [consentChecked, setConsentChecked] = useState(false)
  const [fingerprintState, setFingerprintState] = useState<CaptureState>('idle')
  const [facialState, setFacialState] = useState<CaptureState>('idle')
  const [capturedFingerprint, setCapturedFingerprint] = useState<string | null>(null)
  const [capturedFacial, setCapturedFacial] = useState<string | null>(null)

  const recordConsent = useRecordConsent(guardian.id)
  const enroll = useEnrollBiometric(studentId, guardian.id)

  const guardianName = `${guardian.firstName} ${guardian.lastName}`

  const simulateCapture = (
    type: 'fingerprint' | 'facial',
    setState: (s: CaptureState) => void,
    setValue: (v: string) => void,
  ) => {
    setState('scanning')
    setTimeout(() => {
      const token = btoa(`${type}-sim-${guardian.id}-${Date.now()}`)
      setValue(token)
      setState('captured')
    }, 1800)
  }

  const handleConsentAndContinue = () => {
    recordConsent.mutate(undefined, {
      onSuccess: () => setStep('capture'),
    })
  }

  const handleEnroll = () => {
    let template: string
    let templateType: 'fingerprint' | 'facial' | 'both'

    if (capturedFingerprint && capturedFacial) {
      template = JSON.stringify({ fingerprint: capturedFingerprint, facial: capturedFacial })
      templateType = 'both'
    } else if (capturedFingerprint) {
      template = capturedFingerprint
      templateType = 'fingerprint'
    } else {
      template = capturedFacial!
      templateType = 'facial'
    }

    enroll.mutate({ template, templateType }, { onSuccess: onClose })
  }

  const canEnrollNow = capturedFingerprint !== null || capturedFacial !== null

  const scannerRingClass = (state: CaptureState) => {
    if (state === 'scanning') return 'scanner-ring scanning'
    if (state === 'captured') return 'scanner-ring verified'
    return 'scanner-ring'
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1050 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="biometric-enroll-title"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">

            {/* Header */}
            <div
              className="modal-header text-white border-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              <h5 className="modal-title fw-bold" id="biometric-enroll-title">
                <i className="pi pi-fingerprint me-2" />
                Biometric Enrollment — {guardianName}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                disabled={recordConsent.isPending || enroll.isPending}
                aria-label="Close"
              />
            </div>

            {/* Step breadcrumb */}
            <div className="px-4 pt-3 pb-1 d-flex gap-2 align-items-center">
              <span
                className={`badge rounded-pill px-3 py-2 ${step === 'consent' ? 'bg-primary' : 'bg-success'}`}
                style={{ fontSize: 13 }}
              >
                {step !== 'consent' ? <i className="pi pi-check me-1" /> : '1 '}
                Consent
              </span>
              <div
                className="flex-grow-1"
                style={{ height: 2, background: step === 'capture' ? '#198754' : '#dee2e6', borderRadius: 2 }}
              />
              <span
                className={`badge rounded-pill px-3 py-2 ${step === 'capture' ? 'bg-primary' : 'bg-secondary'}`}
                style={{ fontSize: 13 }}
              >
                2 Capture
              </span>
            </div>

            {/* Body */}
            <div className="modal-body px-4 py-3">

              {/* ── Step 1: Consent ─────────────────────────────────── */}
              {step === 'consent' && (
                <div>
                  <div className="alert alert-info mb-3" role="alert">
                    <strong>
                      <i className="pi pi-info-circle me-2" />
                      Biometric Data Notice
                    </strong>
                    <p className="mb-1 mt-1">
                      Biometric data collected here is used exclusively for verifying the identity
                      of <strong>{guardianName}</strong> during student pickup at the school gate.
                    </p>
                    <p className="mb-0" style={{ fontSize: 13 }}>
                      Templates are stored encrypted (AES-256-GCM) in an isolated vault. Raw data is
                      never transmitted or shared. Consent can be revoked at any time, which will
                      permanently delete all stored biometric data for this guardian.
                    </p>
                  </div>

                  {recordConsent.error && (
                    <div className="alert alert-danger py-2">
                      <i className="pi pi-exclamation-triangle me-2" />
                      {(recordConsent.error as any)?.response?.data?.message ?? recordConsent.error.message}
                    </div>
                  )}

                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="consent-check"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="consent-check">
                      I confirm that <strong>{guardianName}</strong> has been informed about and
                      given explicit consent for the collection and use of their biometric data for
                      student pickup verification.
                    </label>
                  </div>
                </div>
              )}

              {/* ── Step 2: Capture ──────────────────────────────────── */}
              {step === 'capture' && (
                <div>
                  <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                    Capture at least one biometric modality for <strong>{guardianName}</strong>.
                    Place the guardian&apos;s finger on the scanner or position them for facial
                    recognition, then click the simulate button below each scanner.
                  </p>

                  {enroll.error && (
                    <div className="alert alert-danger py-2 mb-3">
                      <i className="pi pi-exclamation-triangle me-2" />
                      {(enroll.error as any)?.response?.data?.message ?? enroll.error.message}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Fingerprint card */}
                    <div className="col-md-6">
                      <div className="card h-100 border">
                        <div className="card-body d-flex flex-column align-items-center py-4">
                          <h6 className="fw-semibold mb-3">
                            <i className="pi pi-fingerprint me-1" />
                            Fingerprint
                          </h6>
                          <div className="biometric-scanner-container">
                            <div className={scannerRingClass(fingerprintState)}>
                              {fingerprintState === 'captured' ? (
                                <i className="pi pi-check scanner-icon" style={{ color: '#198754', fontSize: '3rem' }} />
                              ) : (
                                <i className="pi pi-fingerprint scanner-icon" />
                              )}
                            </div>
                          </div>
                          <p className="text-muted mt-2 mb-3" style={{ fontSize: 12, textAlign: 'center' }}>
                            {fingerprintState === 'idle' && 'Ready to scan'}
                            {fingerprintState === 'scanning' && 'Scanning…'}
                            {fingerprintState === 'captured' && 'Fingerprint captured'}
                          </p>
                          <button
                            type="button"
                            className={`btn btn-sm ${fingerprintState === 'captured' ? 'btn-success' : 'btn-outline-primary'}`}
                            onClick={() => simulateCapture('fingerprint', setFingerprintState, setCapturedFingerprint)}
                            disabled={fingerprintState === 'scanning' || fingerprintState === 'captured'}
                          >
                            {fingerprintState === 'scanning' && <span className="spinner-border spinner-border-sm me-2" />}
                            {fingerprintState === 'captured' ? (
                              <><i className="pi pi-check me-1" />Captured</>
                            ) : (
                              'Simulate Fingerprint Capture'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Facial card */}
                    <div className="col-md-6">
                      <div className="card h-100 border">
                        <div className="card-body d-flex flex-column align-items-center py-4">
                          <h6 className="fw-semibold mb-3">
                            <i className="pi pi-camera me-1" />
                            Facial Recognition
                          </h6>
                          <div className="biometric-scanner-container">
                            <div className={scannerRingClass(facialState)}>
                              {facialState === 'captured' ? (
                                <i className="pi pi-check scanner-icon" style={{ color: '#198754', fontSize: '3rem' }} />
                              ) : (
                                <i className="pi pi-camera scanner-icon" />
                              )}
                            </div>
                          </div>
                          <p className="text-muted mt-2 mb-3" style={{ fontSize: 12, textAlign: 'center' }}>
                            {facialState === 'idle' && 'Ready to scan'}
                            {facialState === 'scanning' && 'Scanning…'}
                            {facialState === 'captured' && 'Facial template captured'}
                          </p>
                          <button
                            type="button"
                            className={`btn btn-sm ${facialState === 'captured' ? 'btn-success' : 'btn-outline-primary'}`}
                            onClick={() => simulateCapture('facial', setFacialState, setCapturedFacial)}
                            disabled={facialState === 'scanning' || facialState === 'captured'}
                          >
                            {facialState === 'scanning' && <span className="spinner-border spinner-border-sm me-2" />}
                            {facialState === 'captured' ? (
                              <><i className="pi pi-check me-1" />Captured</>
                            ) : (
                              'Simulate Facial Capture'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-top">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={recordConsent.isPending || enroll.isPending}
              >
                Cancel
              </button>

              {step === 'consent' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConsentAndContinue}
                  disabled={!consentChecked || recordConsent.isPending}
                >
                  {recordConsent.isPending && <span className="spinner-border spinner-border-sm me-2" />}
                  Record Consent &amp; Continue
                </button>
              )}

              {step === 'capture' && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleEnroll}
                  disabled={!canEnrollNow || enroll.isPending}
                >
                  {enroll.isPending && <span className="spinner-border spinner-border-sm me-2" />}
                  <i className="pi pi-shield me-2" />
                  Complete Enrollment
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
