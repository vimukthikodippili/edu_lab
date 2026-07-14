import { describe, it, expect } from 'vitest'
import { smoothPoint, type Point } from './smoothPoint'

describe('smoothPoint', () => {
  it('returns the point itself when history has only one point', () => {
    expect(smoothPoint([{ x: 0.5, y: 0.3 }], 5)).toEqual({ x: 0.5, y: 0.3 })
  })

  it('averages all points when history is exactly the window size', () => {
    const history: Point[] = [
      { x: 0, y: 0 },
      { x: 0.2, y: 0 },
      { x: 0.4, y: 0 },
    ]
    const result = smoothPoint(history, 3)
    expect(result.x).toBeCloseTo(0.2)
    expect(result.y).toBe(0)
  })

  it('caps the average to only the last windowSize points, ignoring older ones', () => {
    const history: Point[] = [
      { x: 100, y: 100 }, // far outlier, should be excluded by the window cap
      { x: 0, y: 0 },
      { x: 0.2, y: 0 },
    ]
    const result = smoothPoint(history, 2)
    expect(result.x).toBeCloseTo(0.1)
    expect(result.y).toBe(0)
  })

  it('throws when given an empty history', () => {
    expect(() => smoothPoint([], 5)).toThrow()
  })

  it('reduces jitter: smoothed variance is lower than the raw noisy sequence variance', () => {
    const center = 0.5
    const noisy: Point[] = Array.from({ length: 20 }, (_, i) => ({
      x: center + (i % 2 === 0 ? 0.05 : -0.05),
      y: center,
    }))

    const variance = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    }

    const rawXs = noisy.map((p) => p.x)
    const smoothedXs = noisy.map((_, i) => smoothPoint(noisy.slice(0, i + 1), 5).x)

    expect(variance(smoothedXs)).toBeLessThan(variance(rawXs))
  })
})
