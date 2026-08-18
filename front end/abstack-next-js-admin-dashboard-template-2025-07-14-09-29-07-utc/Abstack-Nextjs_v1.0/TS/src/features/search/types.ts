export type GlobalSearchResultType = 'student' | 'staff' | 'book'

export interface GlobalSearchResult {
  type: GlobalSearchResultType
  id: string
  label: string
  sublabel: string
  url: string
}
