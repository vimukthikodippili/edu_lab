'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, ClipboardList, Eye, ShieldAlert, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { ROLES } from '@/lib/auth/roles'
import { useMhaSession } from '../hooks/useMhaSession'
import { useDomainResults } from '../hooks/useDomainResults'
import { useUpdateDomainResult } from '../hooks/useUpdateDomainResult'
import { useCompleteMhaSession } from '../hooks/useCompleteMhaSession'
import { useMhaSessionSummary } from '../hooks/useMhaSessionSummary'
import { useNotificationContext } from '@/context/useNotificationContext'
import CrisisResourcesModal from './CrisisResourcesModal'
import SessionSummaryModal from './SessionSummaryModal'
import { DISORDER_SECTION_LABELS, type DisorderSection } from '@/types/sims/disorder-registry'
import type { MhaSessionStatus, MhaSessionSummary } from '@/types/sims/mha-session'
import {
  DOMAIN_RESULT_LEVEL_LABELS,
  LEVEL_BADGE_CLASS,
  SELECTABLE_DOMAIN_RESULT_LEVELS,
  type CrisisResource,
  type DomainResultLevel,
  type DomainResultRecord,
} from '@/types/sims/domain-result'

const SAVE_DEBOUNCE_MS = 600
const SAVED_INDICATOR_DURATION_MS = 2000

const SESSION_STATUS_BADGE_CLASS: Record<MhaSessionStatus, string> = {
  draft: 'bg-warning-subtle text-warning border border-warning-subtle',
  complete: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  abandoned: 'bg-secondary-subtle text-secondary border',
}

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string> } } }

function extractErrorMessage(err: unknown): string {
  const e = err as ApiError
  const errors = e?.response?.data?.errors
  if (errors) return Object.values(errors)[0]
  return e?.response?.data?.message ?? (err instanceof Error ? err.message : 'An unexpected error occurred.')
}

function groupBySection(rows: DomainResultRecord[]): [DisorderSection, DomainResultRecord[]][] {
  const groups = new Map<DisorderSection, DomainResultRecord[]>()
  for (const row of rows) {
    const list = groups.get(row.domain.section) ?? []
    list.push(row)
    groups.set(row.domain.section, list)
  }
  return Array.from(groups.entries())
}

interface DomainResultCardProps {
  record: DomainResultRecord
  sessionId: string
  isExpanded: boolean
  isReadOnly: boolean
  onToggleExpanded: () => void
}

function DomainResultCard({ record, sessionId, isExpanded, isReadOnly, onToggleExpanded }: DomainResultCardProps) {
  const updateMutation = useUpdateDomainResult(sessionId)

  // Debounced checkboxes/notes save together as one PATCH; the level dropdown saves immediately
  // (a discrete, deliberate action). Refs (not state) back the debounced flush so a rapid toggle
  // never gets lost to a stale closure reading pre-toggle values.
  const [localSymptoms, setLocalSymptoms] = useState<Set<string>>(() => new Set(record.checkedSymptoms))
  const [localNotes, setLocalNotes] = useState(record.counselorNotes ?? '')
  const symptomsRef = useRef(localSymptoms)
  const notesRef = useRef(localNotes)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [crisisResources, setCrisisResources] = useState<CrisisResource[] | null>(null)

  const flushNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setSaveState('saving')
    updateMutation.mutate(
      {
        id: record.id,
        payload: { checkedSymptoms: Array.from(symptomsRef.current), counselorNotes: notesRef.current || null },
      },
      {
        onSuccess: () => {
          setSaveState('saved')
          setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), SAVED_INDICATOR_DURATION_MS)
        },
        onError: () => setSaveState('error'),
      },
    )
  }, [record.id, updateMutation])

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flushNow, SAVE_DEBOUNCE_MS)
  }, [flushNow])

  // Flush a pending debounce on collapse or unmount so a collapse never silently drops an edit.
  useEffect(() => {
    if (!isExpanded && debounceRef.current) {
      flushNow()
    }
  }, [isExpanded, flushNow])
  useEffect(() => () => { if (debounceRef.current) flushNow() }, [flushNow])

  const toggleSymptom = (symptom: string) => {
    if (isReadOnly) return
    const next = new Set(symptomsRef.current)
    next.has(symptom) ? next.delete(symptom) : next.add(symptom)
    symptomsRef.current = next
    setLocalSymptoms(next)
    scheduleSave()
  }

  const handleNotesChange = (value: string) => {
    if (isReadOnly) return
    notesRef.current = value
    setLocalNotes(value)
    scheduleSave()
  }

  const handleLevelChange = (level: DomainResultLevel) => {
    if (isReadOnly) return
    setSaveState('saving')
    updateMutation.mutate(
      { id: record.id, payload: { level } },
      {
        onSuccess: () => {
          setSaveState('saved')
          setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), SAVED_INDICATOR_DURATION_MS)
        },
        onError: () => setSaveState('error'),
      },
    )
  }

  const handleSafetyFlagCheck = () => {
    if (isReadOnly || record.safetyFlagRaised) return
    setSaveState('saving')
    updateMutation.mutate(
      { id: record.id, payload: { safetyFlagRaised: true } },
      {
        onSuccess: (updated) => {
          setSaveState('saved')
          setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), SAVED_INDICATOR_DURATION_MS)
          if (updated.crisisResources?.length) {
            setCrisisResources(updated.crisisResources)
          }
        },
        onError: () => setSaveState('error'),
      },
    )
  }

  const showSoftWarning = record.level !== 'not_assessed' && record.level !== 'none' && localSymptoms.size === 0

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div
        className="card-body py-3 d-flex align-items-center justify-content-between gap-3 flex-wrap"
        style={{ cursor: 'pointer' }}
        onClick={onToggleExpanded}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="fw-semibold">{record.domain.name}</span>
          {record.domain.safetyFlag && <ShieldAlert size={14} className="text-danger" />}
        </div>
        <div className="d-flex align-items-center gap-2">
          {saveState === 'saving' && <span className="spinner-border spinner-border-sm text-muted" />}
          {saveState === 'saved' && <Check size={14} className="text-success" />}
          {saveState === 'error' && <span className="small text-danger">Save failed</span>}
          <span className={`badge ${LEVEL_BADGE_CLASS[record.level]}`}>{DOMAIN_RESULT_LEVEL_LABELS[record.level]}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isExpanded && (
        <div className="card-body border-top pt-3" onClick={(e) => e.stopPropagation()}>
          <div className="row g-3 mb-3 small text-muted">
            <div className="col-md-6">
              <strong className="text-dark">Age range:</strong> {record.domain.ageMin}–{record.domain.ageMax}
            </div>
            <div className="col-md-6">
              <strong className="text-dark">Reference test(s):</strong> {record.domain.tests.join(', ') || '—'}
            </div>
          </div>

          <label className="form-label fw-semibold small mb-2">Observed Symptoms</label>
          <div className="d-flex flex-column gap-2 mb-3">
            {record.domain.symptoms.length === 0 && <div className="text-muted small">No symptom checklist configured for this domain.</div>}
            {record.domain.symptoms.map((symptom) => (
              <div key={symptom} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`symptom-${record.id}-${symptom}`}
                  checked={localSymptoms.has(symptom)}
                  disabled={isReadOnly}
                  onChange={() => toggleSymptom(symptom)}
                />
                <label className="form-check-label small" htmlFor={`symptom-${record.id}-${symptom}`}>
                  {symptom}
                </label>
              </div>
            ))}
          </div>

          {record.domain.safetyFlag && (
            <div className="border border-danger rounded-3 p-3 mb-3" style={{ borderWidth: 2 }}>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input border-danger"
                  id={`safety-flag-${record.id}`}
                  checked={record.safetyFlagRaised}
                  disabled={isReadOnly || record.safetyFlagRaised}
                  onChange={handleSafetyFlagCheck}
                />
                <label className="form-check-label fw-semibold text-danger small" htmlFor={`safety-flag-${record.id}`}>
                  Student has expressed thoughts of self-harm or suicide (safety flag)
                </label>
              </div>
              {record.safetyFlagRaised && (
                <div className="small text-muted mt-1">This flag has been recorded and cannot be undone.</div>
              )}
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small mb-1">Risk Level</label>
              <select
                className="form-select form-select-sm"
                value={record.level === 'not_assessed' ? '' : record.level}
                disabled={isReadOnly}
                onChange={(e) => handleLevelChange(e.target.value as DomainResultLevel)}
              >
                <option value="" disabled>— Not assessed —</option>
                {SELECTABLE_DOMAIN_RESULT_LEVELS.map((level) => (
                  <option key={level} value={level}>{DOMAIN_RESULT_LEVEL_LABELS[level]}</option>
                ))}
              </select>
            </div>
          </div>

          {showSoftWarning && (
            <div className="d-flex align-items-start gap-2 rounded-3 p-2 mb-3 small" style={{ background: '#fff7ed', color: '#c2410c' }}>
              <ShieldAlert size={14} className="mt-1 flex-shrink-0" />
              <span>No symptoms are checked for this level. You may still save it — this is a reminder, not a block.</span>
            </div>
          )}

          <label className="form-label fw-semibold small mb-1">Counselor Notes</label>
          <textarea
            className="form-control form-control-sm"
            rows={3}
            value={localNotes}
            disabled={isReadOnly}
            placeholder="Observations, context, or caveats…"
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={flushNow}
          />
        </div>
      )}

      {crisisResources && (
        <CrisisResourcesModal resources={crisisResources} onClose={() => setCrisisResources(null)} />
      )}
    </div>
  )
}

interface Props {
  sessionId: string
}

export function MhaSessionIntakeContent({ sessionId }: Props) {
  const user = useAuthStore((s) => s.user)
  const { data: session, isLoading: sessionLoading } = useMhaSession(sessionId)
  const isReadOnly = user?.role === ROLES.PRINCIPAL || session?.status !== 'draft'

  const { data: domainResults, isLoading: resultsLoading } = useDomainResults(sessionId)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const completeMutation = useCompleteMhaSession()
  const { showNotification } = useNotificationContext()

  // AC #4/#5 — shown immediately after completion (justCompletedSummary, from the mutation's
  // own response) and re-viewable later (showSummaryModal, fetched on demand via GET .../summary
  // per FR-MHA-26's "permanent, retrievable record") — two independent flows so revisiting the
  // page never needs to re-run the completion mutation just to see the summary again.
  const [justCompletedSummary, setJustCompletedSummary] = useState<MhaSessionSummary | null>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const { data: fetchedSummary } = useMhaSessionSummary(sessionId, showSummaryModal)

  const grouped = useMemo(() => groupBySection(domainResults ?? []), [domainResults])

  const handleComplete = () => {
    completeMutation.mutate(sessionId, {
      onSuccess: (data) => {
        showNotification({ variant: 'success', message: 'Session completed.' })
        setJustCompletedSummary(data)
      },
      onError: (err) => showNotification({ variant: 'danger', message: extractErrorMessage(err) }),
    })
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1180 }}>
      <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
            style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
          >
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h4 className="mb-0 fw-bold d-flex align-items-center gap-2">
              Domain Intake {session && <code className="text-primary fs-6">{session.caseNumber}</code>}
              {session && (
                <span className={`badge text-uppercase ${SESSION_STATUS_BADGE_CLASS[session.status]}`}>
                  {session.status}
                </span>
              )}
              {user?.role === ROLES.PRINCIPAL && (
                <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1">
                  <Eye size={12} /> Read-only
                </span>
              )}
            </h4>
            <p className="text-muted small mb-0">
              Check off observed symptoms and assign a risk level per domain. Nothing here is pre-filled or computed for you.
            </p>
          </div>
        </div>

        {session && session.status === 'draft' && user?.role !== ROLES.PRINCIPAL && (
          <button
            type="button"
            className="btn btn-sm text-white fw-semibold"
            style={{ background: '#16a34a', border: 'none' }}
            disabled={completeMutation.isPending}
            onClick={handleComplete}
          >
            {completeMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : 'Complete Session'}
          </button>
        )}

        {session && session.status === 'complete' && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setShowSummaryModal(true)}
          >
            View Summary
          </button>
        )}
      </div>

      {(sessionLoading || resultsLoading) && <div className="text-muted small">Loading session…</div>}

      {!sessionLoading && !resultsLoading && grouped.length === 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">No domains were recorded for this session.</div>
        </div>
      )}

      {grouped.map(([section, rows]) => (
        <div key={section} className="mb-4">
          <div className="fw-semibold small text-muted text-uppercase mb-2">{DISORDER_SECTION_LABELS[section]}</div>
          {rows.map((row) => (
            <DomainResultCard
              key={row.id}
              record={row}
              sessionId={sessionId}
              isExpanded={expandedId === row.id}
              isReadOnly={isReadOnly}
              onToggleExpanded={() => setExpandedId(expandedId === row.id ? null : row.id)}
            />
          ))}
        </div>
      ))}

      {justCompletedSummary && (
        <SessionSummaryModal summary={justCompletedSummary} onClose={() => setJustCompletedSummary(null)} />
      )}
      {!justCompletedSummary && showSummaryModal && fetchedSummary && (
        <SessionSummaryModal summary={fetchedSummary} onClose={() => setShowSummaryModal(false)} />
      )}
    </div>
  )
}
