'use client'
import { useState } from 'react'
import { Compass, Lightbulb, RotateCcw, Sparkles } from 'lucide-react'
import { useOceanQuestions } from '../hooks/useOceanQuestions'
import { useRiasecQuestions } from '../hooks/useRiasecQuestions'
import { useSubmitOcean } from '../hooks/useSubmitOcean'
import { useSubmitRiasec } from '../hooks/useSubmitRiasec'
import { LikertScale } from './LikertScale'
import { useNotificationContext } from '@/context/useNotificationContext'
import type { CareerAssessmentResult } from '../types'

const STEPS = [
  { id: 1, label: 'Personality (OCEAN)', icon: <Sparkles size={14} /> },
  { id: 2, label: 'Interests (RIASEC)', icon: <Compass size={14} /> },
  { id: 3, label: 'My Results', icon: <Lightbulb size={14} /> },
]

const LEVEL_LABEL: Record<string, string> = { low: 'Lower', moderate: 'Moderate', high: 'Higher' }

export function SelfDiscoveryWizard() {
  const { showNotification } = useNotificationContext()
  const [step, setStep] = useState(1)
  const [oceanAnswers, setOceanAnswers] = useState<Record<string, number>>({})
  const [riasecAnswers, setRiasecAnswers] = useState<Record<string, number>>({})
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [result, setResult] = useState<CareerAssessmentResult | null>(null)

  const { data: oceanQuestions, isLoading: oceanLoading } = useOceanQuestions()
  const { data: riasecQuestions, isLoading: riasecLoading } = useRiasecQuestions()
  const submitOcean = useSubmitOcean()
  const submitRiasec = useSubmitRiasec()

  const oceanComplete = !!oceanQuestions?.length && oceanQuestions.every((q) => oceanAnswers[q.id] != null)
  const riasecComplete = !!riasecQuestions?.length && riasecQuestions.every((q) => riasecAnswers[q.id] != null)

  const handleSubmitOcean = () => {
    if (!oceanQuestions) return
    const answers = oceanQuestions.map((q) => ({ questionId: q.id, value: oceanAnswers[q.id] }))
    submitOcean.mutate(answers, {
      onSuccess: (data) => {
        setAssessmentId(data.id)
        setStep(2)
      },
      onError: () => showNotification({ variant: 'danger', message: 'Could not save your answers. Please try again.' }),
    })
  }

  const handleSubmitRiasec = () => {
    if (!riasecQuestions || !assessmentId) return
    const answers = riasecQuestions.map((q) => ({ questionId: q.id, value: riasecAnswers[q.id] }))
    submitRiasec.mutate(
      { assessmentId, answers },
      {
        onSuccess: (data) => {
          setResult(data)
          setStep(3)
        },
        onError: () => showNotification({ variant: 'danger', message: 'Could not save your answers. Please try again.' }),
      },
    )
  }

  const handleRetake = () => {
    setStep(1)
    setOceanAnswers({})
    setRiasecAnswers({})
    setAssessmentId(null)
    setResult(null)
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        {/* Step indicator */}
        <div className="d-flex justify-content-between position-relative mb-4">
          <div className="position-absolute bg-light border" style={{ height: 2, top: 20, left: 0, right: 0, zIndex: 0 }} />
          {STEPS.map((s) => {
            const done = step > s.id
            const active = step === s.id
            return (
              <div key={s.id} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1 }}>
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center mb-1 ${done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-white border text-muted'}`}
                  style={{ width: 40, height: 40 }}
                >
                  {s.icon}
                </div>
                <small className={active ? 'fw-semibold' : 'text-muted'} style={{ fontSize: 12 }}>{s.label}</small>
              </div>
            )
          })}
        </div>

        {/* Step 1: OCEAN */}
        {step === 1 && (
          <div>
            {oceanLoading ? (
              <div className="text-muted py-4">Loading questions…</div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {oceanQuestions?.map((q) => (
                  <div key={q.id}>
                    <p className="fw-semibold small mb-2">{q.text}</p>
                    <LikertScale
                      value={oceanAnswers[q.id]}
                      onChange={(v) => setOceanAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      lowLabel="Strongly disagree"
                      highLabel="Strongly agree"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary align-self-end"
                  disabled={!oceanComplete || submitOcean.isPending}
                  onClick={handleSubmitOcean}
                >
                  {submitOcean.isPending ? 'Saving…' : 'Next: Interests'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: RIASEC */}
        {step === 2 && (
          <div>
            {riasecLoading ? (
              <div className="text-muted py-4">Loading questions…</div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {riasecQuestions?.map((q) => (
                  <div key={q.id}>
                    <p className="fw-semibold small mb-2">{q.text}</p>
                    <LikertScale
                      value={riasecAnswers[q.id]}
                      onChange={(v) => setRiasecAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      lowLabel="Not interested"
                      highLabel="Very interested"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary align-self-end"
                  disabled={!riasecComplete || submitRiasec.isPending}
                  onClick={handleSubmitRiasec}
                >
                  {submitRiasec.isPending ? 'Saving…' : 'See My Results'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results — descriptive only, never a verdict */}
        {step === 3 && result && (
          <div className="d-flex flex-column gap-4">
            <div className="alert alert-info small mb-0">
              These results are advisory only — for you to explore and discuss, not a decision about your subjects or stream.
            </div>

            <div>
              <h6 className="fw-bold mb-3">Your Personality Traits</h6>
              <div className="row g-3">
                {result.oceanTraitDescriptions.map((t) => (
                  <div key={t.trait} className="col-12 col-md-6">
                    <div className="border rounded-3 p-3 h-100">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-semibold small text-capitalize">{t.trait}</span>
                        <span className="badge bg-secondary-subtle text-secondary border">{LEVEL_LABEL[t.level]}</span>
                      </div>
                      <p className="text-muted small mb-0">{t.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h6 className="fw-bold mb-3">Exploration Suggestions</h6>
              <div className="row g-3">
                {result.riasecSuggestions?.map((s) => (
                  <div key={s.dimension} className="col-12 col-md-4">
                    <div
                      className="rounded-3 p-3 h-100"
                      style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}
                    >
                      <p className="fw-semibold small mb-1" style={{ color: '#0f766e' }}>{s.label}</p>
                      <p className="small mb-0" style={{ color: '#134e4a' }}>{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="btn btn-outline-secondary align-self-start d-flex align-items-center gap-2" onClick={handleRetake}>
              <RotateCcw size={14} /> Retake Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
