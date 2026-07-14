/**
 * Without pinch-gesture pen-lift (FR-LM-14, deferred), a new stroke starts whenever the
 * fingertip hasn't been detected for more than `gapThresholdMs` — otherwise the last point
 * of an old gesture would connect to the first point of an unrelated one.
 */
export function shouldStartNewStroke(
  lastSeenAt: number | null,
  now: number,
  gapThresholdMs: number,
): boolean {
  if (lastSeenAt === null) return true
  return now - lastSeenAt > gapThresholdMs
}
