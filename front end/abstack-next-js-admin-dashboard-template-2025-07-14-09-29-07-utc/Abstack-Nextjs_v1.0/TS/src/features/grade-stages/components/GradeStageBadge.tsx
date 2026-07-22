'use client'
import { useGradeStages } from '../hooks/useGradeStages'

/** Resolves a grade level to its covering stage client-side (mirrors the backend's
 * resolveStageForLevel range lookup) — grade.stage no longer exists on any API response, since
 * stage membership is always computed, never stored. Renders nothing distinguishable for a gap
 * (a level covered by no stage) rather than guessing. */
export function GradeStageBadge({ level }: { level: number }) {
  const { data: stages } = useGradeStages()
  const stage = stages?.find((s) => level >= s.fromGrade && level <= s.toGrade)

  return (
    <span className="badge bg-light text-muted border">
      {stage ? stage.stageName : 'Unclassified'}
    </span>
  )
}
