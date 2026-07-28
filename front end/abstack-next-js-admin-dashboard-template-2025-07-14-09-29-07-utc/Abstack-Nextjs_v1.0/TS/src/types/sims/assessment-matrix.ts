export type AgeBand = '5_8' | '9_12' | '13_15' | '16_19'

export interface AssessmentMatrixRow {
  domainId: string
  domainCode: string
  domainName: string
  bands: Record<AgeBand, boolean>
}

export const AGE_BAND_ORDER: AgeBand[] = ['5_8', '9_12', '13_15', '16_19']

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  '5_8': '5–8',
  '9_12': '9–12',
  '13_15': '13–15',
  '16_19': '16–19',
}
