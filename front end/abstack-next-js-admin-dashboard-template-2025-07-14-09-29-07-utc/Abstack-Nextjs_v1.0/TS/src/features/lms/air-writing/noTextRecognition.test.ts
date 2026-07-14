import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Structural guardrail (mirrors the backend's FORBIDDEN_CLINICAL_TERMS blocklist convention
 * from FR-SA-02) — asserts the whiteboard rendering pipeline never imports or calls any
 * OCR/handwriting-to-text function. FR-LM-13 is explicit that this version displays the raw
 * drawn stroke path only; if anyone ever adds a text-recognition step here, this test fails.
 */
const FORBIDDEN_TERMS = [
  'tesseract',
  'ocr',
  'recognizetext',
  'handwritingtotext',
  'visionapi',
  'googlevision',
  'azurevision',
  'mlkit',
]

const PIPELINE_FILES = [
  'components/WhiteboardOverlay.tsx',
  'hooks/useWhiteboardChannel.ts',
  'hooks/useHandTracking.ts',
  'types.ts',
]

describe('whiteboard rendering pipeline — no text-recognition/OCR', () => {
  it.each(PIPELINE_FILES)('%s does not import or call any text-recognition function', (relativePath) => {
    const source = readFileSync(join(__dirname, relativePath), 'utf-8').toLowerCase()
    for (const term of FORBIDDEN_TERMS) {
      expect(source).not.toContain(term)
    }
  })
})
