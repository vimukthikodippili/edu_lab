'use client'
import { useEffect, useState } from 'react'
import { ListChecks, Plus, Check, X } from 'lucide-react'
import { useSubjectTopics } from '../hooks/useSubjectTopics'
import { useCreateTopic } from '../hooks/useCreateTopic'
import type { QuestionType } from '@/types/sims/grades'
import { QUESTION_TYPE_LABELS } from '@/types/sims/grades'

export interface TopicAllocation {
  subjectTopicId: string
  maxMarks: number
  questionType?: QuestionType
}

interface TopicAllocationEditorProps {
  subjectId: string
  onAllocationsChange: (allocations: TopicAllocation[]) => void
  /** Only assessments (exam-style papers) track a per-topic question format — assignment/
   * homework allocation reuses this same editor without it. */
  showQuestionType?: boolean
  /** Section Head only — views/manages a specific teacher's own topic list instead of the
   * caller's own, e.g. when scheduling an assessment on that teacher's behalf. */
  teacherId?: string
}

/** Shared by the assessment and assignment creation forms — lists the subject's active topics,
 * lets the teacher enter a max mark per topic (0 = not allocated for this particular
 * assessment/assignment, matching this feature's own examples where not every topic gets
 * marks every time), and shows a live, read-only computed total in place of a manual input.
 * Also lets the teacher add a brand-new topic inline, without leaving this form. */
export default function TopicAllocationEditor({
  subjectId,
  onAllocationsChange,
  showQuestionType = false,
  teacherId,
}: TopicAllocationEditorProps) {
  const { data: topics, isLoading } = useSubjectTopics(subjectId || undefined, teacherId)
  const [marksByTopicId, setMarksByTopicId] = useState<Record<string, number>>({})
  const [typeByTopicId, setTypeByTopicId] = useState<Record<string, QuestionType>>({})

  const [showAddRow, setShowAddRow] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const createMutation = useCreateTopic()

  useEffect(() => {
    setMarksByTopicId({})
    setTypeByTopicId({})
  }, [subjectId])

  useEffect(() => {
    const allocations = Object.entries(marksByTopicId)
      .filter(([, maxMarks]) => maxMarks > 0)
      .map(([subjectTopicId, maxMarks]) => ({
        subjectTopicId,
        maxMarks,
        ...(showQuestionType ? { questionType: typeByTopicId[subjectTopicId] ?? 'structured' } : {}),
      }))
    onAllocationsChange(allocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksByTopicId, typeByTopicId])

  const total = Object.values(marksByTopicId).reduce((sum, m) => sum + (m > 0 ? m : 0), 0)

  const handleAddTopic = () => {
    const title = addTitle.trim()
    if (!title) return
    createMutation.mutate(
      { subjectId, title, ...(teacherId ? { teacherId } : {}) },
      {
        onSuccess: () => {
          setAddTitle('')
          setShowAddRow(false)
        },
      },
    )
  }

  if (!subjectId) return null

  if (isLoading) {
    return (
      <div className="placeholder-glow">
        <span className="placeholder col-12 rounded" style={{ height: 80, display: 'block' }} />
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-1">
        <label className="form-label fw-semibold small d-flex align-items-center gap-2 mb-0">
          <ListChecks size={14} /> Topic Mark Allocation
        </label>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
          onClick={() => { setShowAddRow(true); setAddTitle('') }}
        >
          <Plus size={13} /> Add Topic
        </button>
      </div>
      <div className="card border-0" style={{ background: '#f8fafc' }}>
        <div className="card-body p-3">
          {showAddRow && (
            <div className="d-flex align-items-center gap-2 mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="New topic title…"
                value={addTitle}
                maxLength={120}
                autoFocus
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddTopic() }
                  if (e.key === 'Escape') { setShowAddRow(false); setAddTitle('') }
                }}
              />
              <button
                type="button"
                className="btn btn-success btn-sm px-2"
                disabled={createMutation.isPending || !addTitle.trim()}
                onClick={handleAddTopic}
              >
                {createMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-2"
                disabled={createMutation.isPending}
                onClick={() => { setShowAddRow(false); setAddTitle('') }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {(topics ?? []).map((topic) => {
            const marks = marksByTopicId[topic.id] ?? 0
            return (
              <div key={topic.id} className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <span className="small flex-grow-1">{topic.title}</span>
                {showQuestionType && marks > 0 && (
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 120 }}
                    value={typeByTopicId[topic.id] ?? 'structured'}
                    onChange={(e) =>
                      setTypeByTopicId((prev) => ({ ...prev, [topic.id]: e.target.value as QuestionType }))
                    }
                  >
                    {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((qt) => (
                      <option key={qt} value={qt}>{QUESTION_TYPE_LABELS[qt]}</option>
                    ))}
                  </select>
                )}
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 100 }}
                  min={0}
                  max={1000}
                  value={marksByTopicId[topic.id] ?? ''}
                  placeholder="0"
                  onChange={(e) =>
                    setMarksByTopicId((prev) => ({
                      ...prev,
                      [topic.id]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            )
          })}

          {(topics ?? []).length === 0 && !showAddRow && (
            <p className="small text-muted mb-2">No topics yet — use &ldquo;Add Topic&rdquo; above to create one.</p>
          )}

          <div
            className="d-flex align-items-center justify-content-between pt-2 mt-1"
            style={{ borderTop: '1px solid #e2e8f0' }}
          >
            <span className="small fw-bold">Total</span>
            <span className="fw-bold" style={{ color: total > 0 ? '#15803d' : '#94a3b8' }}>
              {total} marks
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
