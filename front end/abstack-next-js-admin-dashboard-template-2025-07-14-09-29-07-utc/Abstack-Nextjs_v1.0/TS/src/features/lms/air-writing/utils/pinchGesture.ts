export interface Point {
  x: number
  y: number
}

/** Plain Euclidean distance between two points — used both for the raw thumb/index distance
 * and for the palm-size reference distance (wrist to middle-finger MCP) it gets normalized by. */
export function computeDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/** `normalizedDistance` is the thumb-tip-to-index-tip distance divided by a stable palm-size
 * reference (not a raw pixel distance) — that's what makes the threshold invariant to how close
 * the hand is to the camera. Below the threshold counts as pinching. */
export function isPinching(normalizedDistance: number, threshold: number): boolean {
  return normalizedDistance < threshold
}
