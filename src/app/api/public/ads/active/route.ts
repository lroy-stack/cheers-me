import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/public/ads/active — Get active ads for a display page (public)
 * Query params: ?page=digital_menu|booking
 */
export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || 'digital_menu'

  if (!['digital_menu', 'booking'].includes(page)) {
    return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
  }

  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().slice(0, 5) // HH:MM
  const dayOfWeek = now.getDay()

  const { data, error } = await supabase
    .from('advertisements')
    .select('id, title_en, title_nl, title_es, title_de, description_en, description_nl, description_es, description_de, cta_text_en, cta_text_nl, cta_text_es, cta_text_de, cta_url, image_url, image_mobile_url, background_color, text_color, template, placement, priority')
    .eq('status', 'active')
    .contains('display_pages', [page])
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .or(`start_time.is.null,start_time.lte.${currentTime}`)
    .or(`end_time.is.null,end_time.gte.${currentTime}`)
    .contains('days_of_week', [dayOfWeek])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
