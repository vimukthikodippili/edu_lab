import { describe, it, expect } from 'vitest'
import { computeDistance, isPinching, type Point } from './pinchGesture'

describe('computeDistance', () => {
  it('computes the Euclidean distance between two points (3-4-5 triangle)', () => {
    const a: Point = { x: 0, y: 0 }
    const b: Point = { x: 3, y: 4 }
    expect(computeDistance(a, b)).toBe(5)
  })

  it('returns 0 for identical points', () => {
    const p: Point = { x: 10, y: 10 }
    expect(computeDistance(p, p)).toBe(0)
  })

  it('is symmetric regardless of argument order', () => {
    const a: Point = { x: 1, y: 2 }
    const b: Point = { x: 8, y: 6 }
    expect(computeDistance(a, b)).toBe(computeDistance(b, a))
  })
})

describe('isPinching', () => {
  const threshold = 0.4

  it('is true when the normalized distance is clearly below the threshold (fingers touching)', () => {
    expect(isPinching(0.05, threshold)).toBe(true)
  })

  it('is false when the normalized distance is clearly above the threshold (hand open)', () => {
    expect(isPinching(1.2, threshold)).toBe(false)
  })

  it('is false exactly at the threshold boundary', () => {
    expect(isPinching(0.4, threshold)).toBe(false)
  })

  it('is true one hundredth below the threshold boundary', () => {
    expect(isPinching(0.39, threshold)).toBe(true)
  })
})
