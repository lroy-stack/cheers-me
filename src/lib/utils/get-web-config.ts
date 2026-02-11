import { createClient } from '@/lib/supabase/server'

interface WebConfig {
  seo_title: string
  meta_description: string
  booking_enabled: boolean
  kiosk_enabled: boolean
  digital_menu_enabled: boolean
}

const DEFAULTS: WebConfig = {
  seo_title: 'GrandCafe Cheers | Mallorca',
  meta_description: 'Your beachfront destination for world kitchen, cocktails, sports, and live DJ nights.',
  booking_enabled: true,
  kiosk_enabled: true,
  digital_menu_enabled: true,
}

/**
 * Fetch restaurant_web config from DB (server-side only).
 * Returns defaults if not found or on error.
 */
export async function getWebConfig(): Promise<WebConfig> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'restaurant_web')
      .single()

    if (data?.value) {
      return { ...DEFAULTS, ...(data.value as Partial<WebConfig>) }
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULTS
}
