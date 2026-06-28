import { getRequestConfig } from 'next-intl/server'
import { routing } from './src/lib/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`./src/i18n/messages/${locale}.json`)).default,
  }
})
