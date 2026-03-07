import type { MetadataRoute } from 'next'

const BASE_URL = 'https://grandcafe-cheers-app.vercel.app'
const LOCALES = ['en', 'nl', 'es', 'de']

export default function sitemap(): MetadataRoute.Sitemap {
  const bookingUrls = LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}/booking`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }))

  const legalUrls = LOCALES.flatMap((locale) =>
    ['privacy', 'terms', 'cookies', 'data-request'].map((page) => ({
      url: `${BASE_URL}/${locale}/legal/${page}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    }))
  )

  const eventUrls = LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}/public/events`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const menuUrls = LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}/public/menu`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...bookingUrls, ...eventUrls, ...menuUrls, ...legalUrls]
}
