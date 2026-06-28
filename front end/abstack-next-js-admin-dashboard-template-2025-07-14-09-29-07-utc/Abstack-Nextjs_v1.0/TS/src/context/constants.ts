type CurrencyType = '₹' | '$' | '€' | 'LKR'

export const currency: CurrencyType = 'LKR'

export const currentYear = new Date().getFullYear()

export const developedByLink = ''

export const developedBy = 'SIMS'

export const contactUs = 'admin@sims.edu.lk'

export const buyLink = ''

export const basePath = ''

export const DEFAULT_PAGE_TITLE = 'SIMS – School Information Management System'

// NestJS backend URL — set in .env.local
export const API_BASE_PATH = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'purple', 'pink', 'orange', 'light', 'link']

// Sri Lankan academic year runs April → March
export const ACADEMIC_YEAR_START_MONTH = 3 // April (0-indexed)

export const SINHALA_LOCALE = 'si'
export const TAMIL_LOCALE = 'ta'
export const ENGLISH_LOCALE = 'en'
