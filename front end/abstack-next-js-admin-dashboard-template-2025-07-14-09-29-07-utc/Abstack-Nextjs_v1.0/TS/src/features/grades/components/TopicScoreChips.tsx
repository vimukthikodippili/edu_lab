'use client'

export interface TopicScoreChipItem {
  subjectTopicId: string
  title: string
  maxMarks: number
  score: number | null
}

/** Renders "Algebra: 14/20 · Geometry: 13/15" style chips — only when at least one
 * topic score exists (the graceful fallback for an assessment/assignment that predates
 * topic allocation: nothing renders, matching the AC's "only show when allocation rows
 * exist" requirement). */
export function TopicScoreChips({ items }: { items: TopicScoreChipItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="d-flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t.subjectTopicId}
          className="badge rounded-pill px-2 py-1 fw-normal"
          style={{ background: '#eef2ff', color: '#3730a3', fontSize: '0.72rem' }}
        >
          {t.title}: {t.score ?? '—'}/{t.maxMarks}
        </span>
      ))}
    </div>
  )
}
