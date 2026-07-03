'use client'
import React, { useState, useRef } from 'react'
import {
  ShieldAlert,
  Fingerprint,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ClipboardCheck,
} from 'lucide-react'
import RoleGuard from '@/components/wrappers/RoleGuard'
import { ROLES } from '@/lib/auth/roles'
import { useVerifyBiometric } from '@/features/biometric/hooks/useVerifyBiometric'
import { useManualOverride } from '@/features/biometric/hooks/useManualOverride'
import type { VerifyResult, OverrideResult } from '@/features/biometric/types'

type ScanState = 'idle' | 'scanning' | 'done'
type OverrideState = 'idle' | 'form' | 'pending' | 'done'

export default function GateTerminalPage() {
  // ── Biometric scan state ───────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('')
  const [guardianId, setGuardianId] = useState('')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Manual override state ─────────────────────────────────────────────────
  const [overrideState, setOverrideState] = useState<OverrideState>('idle')
  const [overrideReason, setOverrideReason] = useState('')
  const [secondaryIdNumber, setSecondaryIdNumber] = useState('')
  const [overrideResult, setOverrideResult] = useState<OverrideResult | null>(null)

  const verify = useVerifyBiometric(guardianId)
  const override = useManualOverride(guardianId)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBeginScan() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setGuardianId(trimmed)
    setScanState('scanning')
    setResult(null)
    setOverrideState('idle')
    setOverrideResult(null)
    setOverrideReason('')
    setSecondaryIdNumber('')

    timerRef.current = setTimeout(() => {
      const scanTemplate = btoa(`fingerprint-sim-${trimmed}-${Date.now()}`)
      verify.mutate(
        { scanTemplate, templateType: 'fingerprint' },
        {
          onSuccess: (data) => {
            setResult(data)
            setScanState('done')
          },
          onError: () => {
            setScanState('idle')
          },
        },
      )
    }, 1800)
  }

  function handleConfirmOverride() {
    if (!overrideReason.trim() || !secondaryIdNumber.trim()) return
    setOverrideState('pending')
    override.mutate(
      { reason: overrideReason.trim(), secondaryIdNumber: secondaryIdNumber.trim() },
      {
        onSuccess: (data) => {
          setOverrideResult(data)
          setOverrideState('done')
        },
        onError: () => {
          setOverrideState('form')
        },
      },
    )
  }

  function handleReset() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setInputValue('')
    setGuardianId('')
    setScanState('idle')
    setResult(null)
    setOverrideState('idle')
    setOverrideReason('')
    setSecondaryIdNumber('')
    setOverrideResult(null)
    verify.reset()
    override.reset()
  }

  // ── Ring CSS class ────────────────────────────────────────────────────────

  const ringClass =
    scanState === 'scanning'
      ? 'scanner-ring scanning'
      : result?.result === 'match' || overrideState === 'done'
        ? 'scanner-ring verified'
        : result
          ? 'scanner-ring failed'
          : 'scanner-ring'

  const overrideCanSubmit =
    overrideReason.trim().length >= 10 &&
    secondaryIdNumber.trim().length > 0 &&
    overrideState !== 'pending'

  return (
    <RoleGuard allowedRoles={[ROLES.SECURITY_OFFICER, ROLES.SYSTEM_ADMIN, ROLES.PRINCIPAL]}>
      <div className="container-fluid px-0">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="d-flex align-items-center gap-3 px-4 py-4 mb-4 rounded-3"
          style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff' }}
        >
          <ShieldAlert size={36} />
          <div>
            <h4 className="mb-0 fw-bold">Gate Terminal — Biometric Verification</h4>
            <small className="opacity-75">Verify guardian identity before student release</small>
          </div>
        </div>

        <div className="row g-4 px-2">
          {/* ── Panel 1: Guardian ID Input ──────────────────────────────── */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column gap-3">
                <h6 className="card-title fw-bold mb-0">Step 1 — Guardian ID</h6>
                <p className="text-muted small mb-0">
                  Scan the guardian&apos;s QR badge or enter the ID manually.
                </p>
                <div>
                  <label className="form-label fw-semibold small">Guardian ID</label>
                  <input
                    type="text"
                    className="form-control font-monospace"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={scanState === 'scanning'}
                  />
                </div>

                <button
                  className="btn btn-danger fw-semibold"
                  onClick={handleBeginScan}
                  disabled={!inputValue.trim() || scanState === 'scanning' || verify.isPending}
                >
                  {scanState === 'scanning' ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Scanning…
                    </>
                  ) : (
                    'Begin Biometric Scan'
                  )}
                </button>

                {verify.isError && (
                  <div className="alert alert-danger py-2 small mb-0">
                    {verify.error?.message ?? 'Verification failed. Please try again.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Panel 2: Scanner Animation ──────────────────────────────── */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column align-items-center justify-content-center py-5">
                <h6 className="card-title fw-bold mb-4">Step 2 — Biometric Capture</h6>
                <div className="biometric-scanner-container">
                  <div className={ringClass}>
                    {result?.result === 'match' || overrideState === 'done' ? (
                      <CheckCircle2 size={56} color="#198754" />
                    ) : result?.result === 'no_match' || result?.result === 'blacklisted' ? (
                      <XCircle size={56} color="#dc3545" />
                    ) : (
                      <Fingerprint
                        size={56}
                        color={scanState === 'scanning' ? '#0dcaf0' : '#6c757d'}
                      />
                    )}
                  </div>
                  <span
                    className={`verification-status-text ${
                      scanState === 'scanning'
                        ? 'scanning'
                        : result?.result === 'match' || overrideState === 'done'
                          ? 'verified'
                          : result
                            ? 'failed'
                            : ''
                    }`}
                  >
                    {scanState === 'idle' && 'Awaiting scan…'}
                    {scanState === 'scanning' && 'Scanning fingerprint…'}
                    {scanState === 'done' && result?.result === 'match' && 'Identity Verified'}
                    {scanState === 'done' && result?.result === 'no_match' && overrideState !== 'done' && 'Verification Failed'}
                    {scanState === 'done' && result?.result === 'blacklisted' && 'Guardian Blacklisted'}
                    {overrideState === 'done' && 'Released via Manual Override'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Panel 3: Result ─────────────────────────────────────────── */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column gap-3">
                <h6 className="card-title fw-bold mb-0">Step 3 — Result</h6>

                {/* Awaiting */}
                {!result && overrideState !== 'done' && (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted py-4">
                    <ShieldAlert size={40} className="mb-2 opacity-25" />
                    <small>Awaiting verification…</small>
                  </div>
                )}

                {/* ── MATCH (biometric) ─────────────────────────────────── */}
                {result?.result === 'match' && (
                  <div className="d-flex flex-column gap-3">
                    <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                      <CheckCircle2 size={22} />
                      <div>
                        <div className="fw-bold">Identity Verified</div>
                        <div className="small">
                          Confidence: <strong>{result.confidence.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>

                    {result.students.length > 0 && (
                      <div>
                        <p className="small fw-semibold mb-2 text-muted">Students to release:</p>
                        {result.students.map((s) => (
                          <div
                            key={s.id}
                            className="d-flex justify-content-between align-items-center border rounded px-3 py-2 mb-2 bg-light"
                          >
                            <span className="fw-semibold">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="badge bg-secondary">{s.classSection}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="alert alert-info py-2 small mb-0">
                      <CheckCircle2 size={14} className="me-1" />
                      Teacher(s) have been notified to send student(s) to the gate.
                    </div>
                  </div>
                )}

                {/* ── NO-MATCH + Manual Override section ───────────────── */}
                {result?.result === 'no_match' && overrideState !== 'done' && (
                  <div className="d-flex flex-column gap-3">
                    <div className="alert alert-danger d-flex flex-column gap-2 mb-0">
                      <div className="d-flex align-items-center gap-2">
                        <XCircle size={22} />
                        <div className="fw-bold">Verification Failed</div>
                      </div>
                      <div className="small">
                        Confidence: <strong>{result.confidence.toFixed(1)}%</strong> (below
                        threshold)
                      </div>
                      <hr className="my-1" />
                      <div className="small">
                        Security officers and administration have been alerted immediately. Do{' '}
                        <strong>not</strong> allow entry without secondary ID check.
                      </div>
                    </div>

                    {/* Manual Override block — FR-GS-11 */}
                    <div className="border-start border-warning border-3 ps-3">
                      <p className="small fw-bold text-warning-emphasis mb-1">
                        Manual Override (FR-GS-11)
                      </p>
                      <p className="small text-muted mb-2">
                        If you have confirmed this guardian&apos;s identity by another means, you
                        may manually authorize release.
                      </p>

                      {overrideState === 'idle' && (
                        <button
                          className="btn btn-warning btn-sm fw-semibold"
                          onClick={() => setOverrideState('form')}
                        >
                          Initiate Manual Override
                        </button>
                      )}

                      {(overrideState === 'form' || overrideState === 'pending') && (
                        <div className="d-flex flex-column gap-2">
                          <div>
                            <label className="form-label small fw-semibold mb-1">
                              Secondary ID Number <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm font-monospace"
                              placeholder="NIC / Passport / Staff card number"
                              value={secondaryIdNumber}
                              onChange={(e) => setSecondaryIdNumber(e.target.value)}
                              disabled={overrideState === 'pending'}
                            />
                          </div>
                          <div>
                            <label className="form-label small fw-semibold mb-1">
                              Reason for Override <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control form-control-sm"
                              rows={3}
                              placeholder="e.g. Fingerprint scanner hardware failure; identity confirmed by NIC card in person (min. 10 characters)"
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              disabled={overrideState === 'pending'}
                            />
                            {overrideReason.length > 0 && overrideReason.trim().length < 10 && (
                              <div className="text-danger small mt-1">
                                Reason must be at least 10 characters.
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <button
                              className="btn btn-warning btn-sm fw-semibold"
                              onClick={handleConfirmOverride}
                              disabled={!overrideCanSubmit}
                            >
                              {overrideState === 'pending' ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-1" />
                                  Releasing…
                                </>
                              ) : (
                                'Confirm & Release Manually'
                              )}
                            </button>
                            {overrideState === 'form' && (
                              <button
                                className="btn btn-link btn-sm text-muted p-0"
                                onClick={() => {
                                  setOverrideState('idle')
                                  setOverrideReason('')
                                  setSecondaryIdNumber('')
                                }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {override.isError && (
                            <div className="alert alert-danger py-2 small mb-0">
                              {override.error?.message ?? 'Override failed. Please try again.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── MANUAL OVERRIDE SUCCESS ───────────────────────────── */}
                {overrideState === 'done' && overrideResult && (
                  <div className="d-flex flex-column gap-3">
                    <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                      <ClipboardCheck size={22} />
                      <div>
                        <div className="fw-bold">Released via Manual Override</div>
                        <div className="small text-muted">
                          Secondary ID checked:{' '}
                          <strong className="font-monospace">
                            {overrideResult.secondaryIdNumber}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {overrideResult.students.length > 0 && (
                      <div>
                        <p className="small fw-semibold mb-2 text-muted">Students to release:</p>
                        {overrideResult.students.map((s) => (
                          <div
                            key={s.id}
                            className="d-flex justify-content-between align-items-center border rounded px-3 py-2 mb-2 bg-light"
                          >
                            <span className="fw-semibold">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="badge bg-secondary">{s.classSection}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="alert alert-info py-2 small mb-0">
                      <ClipboardCheck size={14} className="me-1" />
                      Teacher(s) have been notified. Override logged to audit trail.
                    </div>
                  </div>
                )}

                {/* ── BLACKLISTED ───────────────────────────────────────── */}
                {result?.result === 'blacklisted' && (
                  <div className="alert alert-danger border-danger d-flex flex-column gap-2 mb-0">
                    <div className="d-flex align-items-center gap-2">
                      <AlertTriangle size={22} />
                      <div className="fw-bold">⚠️ Guardian is BLACKLISTED</div>
                    </div>
                    <hr className="my-1" />
                    <div className="small fw-semibold">
                      Do NOT allow entry under any circumstances.
                    </div>
                    <div className="small text-danger-emphasis">
                      Security and administration have been alerted. Keep the guardian under
                      observation until security arrives.
                    </div>
                  </div>
                )}

                {/* ── Reset button ──────────────────────────────────────── */}
                {(result || overrideState === 'done') && (
                  <button
                    className="btn btn-outline-secondary btn-sm mt-auto d-flex align-items-center gap-2"
                    onClick={handleReset}
                  >
                    <RotateCcw size={14} />
                    Verify Next Guardian
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
