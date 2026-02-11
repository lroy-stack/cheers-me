'use client'

import useSWR from 'swr'

interface BrandingData {
  logoUrl: string
  primaryColor: string | null
  accentColor: string | null
  loading: boolean
}

const DEFAULT_LOGO = '/icons/logoheader.png'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useBranding(): BrandingData {
  const { data, isLoading } = useSWR('/api/settings/schedule', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  const branding = data?.restaurant_branding as Record<string, string> | undefined

  return {
    logoUrl: branding?.logo_url || DEFAULT_LOGO,
    primaryColor: branding?.primary_color || null,
    accentColor: branding?.accent_color || null,
    loading: isLoading,
  }
}
