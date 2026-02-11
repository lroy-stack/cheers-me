import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { seedAds } from '@/lib/utils/seed-ads'
import { seedCoupons } from '@/lib/utils/seed-coupons'

/**
 * POST /api/dev/seed?type=ads|coupons|all&force=true
 * Development-only endpoint to insert sample data.
 * Uses admin client (service_role) to bypass RLS.
 * ?force=true will delete existing data before re-inserting.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const force = searchParams.get('force') === 'true'

  const supabase = createAdminClient()
  const results: Record<string, unknown> = {}

  try {
    if (type === 'ads' || type === 'all') {
      results.ads = await seedAds(supabase, force)
    }

    if (type === 'coupons' || type === 'all') {
      results.coupons = await seedCoupons(supabase)
    }

    if (!results.ads && !results.coupons) {
      return NextResponse.json(
        { error: `Invalid type: ${type}. Use ads, coupons, or all.` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    )
  }
}
