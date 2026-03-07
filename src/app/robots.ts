import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/booking', '/en/booking', '/nl/booking', '/es/booking', '/de/booking'],
        disallow: ['/dashboard', '/staff', '/finance', '/crm', '/stock', '/sales', '/events', '/menu', '/marketing', '/settings', '/ai', '/kiosk', '/api/'],
      },
    ],
    sitemap: 'https://grandcafe-cheers-app.vercel.app/sitemap.xml',
  }
}
