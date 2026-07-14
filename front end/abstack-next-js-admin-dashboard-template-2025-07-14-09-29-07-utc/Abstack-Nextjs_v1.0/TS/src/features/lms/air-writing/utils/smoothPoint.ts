export interface Point {
  x: number
  y: number
}

/**
 * Simple moving average over the last `windowSize` points in `history` (the new raw
 * point should already be appended before calling this). Operates on MediaPipe's native
 * normalized [0,1] coordinates — resolution-independent, scaled to canvas pixels only at
 * render time.
 */
export function smoothPoint(history: Point[], windowSize: number): Point {
  if (history.length === 0) {
    throw new Error('smoothPoint requires at least one point in history')
  }
  const window = history.slice(-windowSize)
  const sum = window.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / window.length, y: sum.y / window.length }
}
