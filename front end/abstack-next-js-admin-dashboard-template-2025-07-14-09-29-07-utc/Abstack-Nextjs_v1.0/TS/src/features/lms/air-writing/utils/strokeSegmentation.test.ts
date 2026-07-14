import { describe, it, expect } from 'vitest'
import { shouldStartNewStroke } from './strokeSegmentation'

describe('shouldStartNewStroke', () => {
  it('starts a new stroke when there is no prior detection at all', () => {
    expect(shouldStartNewStroke(null, 1000, 250)).toBe(true)
  })

  it('does not start a new stroke exactly at the gap threshold boundary', () => {
    expect(shouldStartNewStroke(1000, 1250, 250)).toBe(false)
  })

  it('starts a new stroke one millisecond past the gap threshold', () => {
    expect(shouldStartNewStroke(1000, 1251, 250)).toBe(true)
  })

  it('does not start a new stroke for a small, continuous-tracking gap', () => {
    expect(shouldStartNewStroke(1000, 1033, 250)).toBe(false)
  })
})
