import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Exclude pdfkit from bundling — its fontkit dependency uses legacy @swc/helpers
  // imports incompatible with Turbopack. Only used in server-side API routes.
  serverExternalPackages: ['pdfkit'],
  // Production bundle optimization
  compress: true,
  productionBrowserSourceMaps: false,
  // Optimize package imports for tree-shaking
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      'lucide-react',
      'recharts',
      'date-fns',
    ],
  },
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    // Optimize image delivery
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
  },
  // Cache control headers
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Cache-Control', value: 'no-cache' },
      ],
    },
    // Cache static assets for 1 year
    {
      source: '/public/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // Cache API responses selectively
    {
      source: '/api/menu/categories',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
      ],
    },
  ],
}

export default withNextIntl(nextConfig)
