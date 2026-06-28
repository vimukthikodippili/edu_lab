'use client'
import { NotificationProvider } from '@/context/useNotificationContext'
import { SessionProvider } from 'next-auth/react'
import { NextIntlClientProvider } from 'next-intl'
import dynamic from 'next/dynamic'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { ChildrenType } from '../../types/component-props'
import { queryClient } from '@/lib/api/queryClient'
import OfflineBanner from '@/components/ui/OfflineBanner'

const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then((mod) => mod.LayoutProvider), {
  ssr: false,
})

const AppProvidersWrapper = ({ children, messages, locale }: ChildrenType & { messages?: Record<string, unknown>; locale?: string }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <NextIntlClientProvider messages={messages ?? {}} locale={locale ?? 'en'}>
          <LayoutProvider>
            <NotificationProvider>
              <OfflineBanner />
              {children}
              <ToastContainer theme="colored" />
            </NotificationProvider>
          </LayoutProvider>
        </NextIntlClientProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
export default AppProvidersWrapper
