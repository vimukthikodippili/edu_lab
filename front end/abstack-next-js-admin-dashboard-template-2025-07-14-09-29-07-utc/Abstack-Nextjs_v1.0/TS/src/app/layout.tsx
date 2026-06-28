import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import type { Metadata } from 'next'
import { Nunito_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from 'next/font/google'
import { getLocale, getMessages } from 'next-intl/server'

import 'flatpickr/dist/flatpickr.min.css'
import '@/assets/scss/app.scss'

const nunitoSans = Nunito_Sans({
  display: 'swap',
  style: ['normal'],
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-nunito',
})

const notoSinhala = Noto_Sans_Sinhala({
  display: 'swap',
  subsets: ['sinhala'],
  weight: ['400', '700'],
  variable: '--font-sinhala',
})

const notoTamil = Noto_Sans_Tamil({
  display: 'swap',
  subsets: ['tamil'],
  weight: ['400', '700'],
  variable: '--font-tamil',
})

export const metadata: Metadata = {
  title: {
    template: '%s | SIMS – School Information Management',
    default: DEFAULT_PAGE_TITLE,
  },
  description: 'Sri Lankan School Information Management System – manage students, staff, attendance, grades, fees, library, timetable and more.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  const fontClass = [nunitoSans.variable, notoSinhala.variable, notoTamil.variable].join(' ')

  return (
    <html lang={locale}>
      <body className={fontClass}>
        <AppProvidersWrapper messages={messages as Record<string, unknown>} locale={locale}>
          {children}
        </AppProvidersWrapper>
      </body>
    </html>
  )
}
