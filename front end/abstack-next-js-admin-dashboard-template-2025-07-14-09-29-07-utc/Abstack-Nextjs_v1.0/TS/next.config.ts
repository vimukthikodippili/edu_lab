import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'
import createNextIntlPlugin from 'next-intl/plugin'

const withSerwist = withSerwistInit({
  swSrc: 'src/lib/pwa/service-worker.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

export default withNextIntl(withSerwist(nextConfig))
