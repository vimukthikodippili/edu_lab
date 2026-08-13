import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EduLab – School Information Management',
    short_name: 'EduLab',
    description: 'Sri Lankan School Information Management System',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#101f3a',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    lang: 'si',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
