import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { seedAds } from '@/lib/utils/seed-ads'
import { seedCoupons } from '@/lib/utils/seed-coupons'

/**
 * POST /api/dev/seed?type=ads|coupons|all&force=true
 * Development-only endpoint to insert sample data.
 * Requires: NODE_ENV=development AND admin role AND DEV_SEED_SECRET header.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  // Require admin authentication
  const authResult = await requireRole(['admin'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  // Require secret header for extra protection
  const seedSecret = process.env.DEV_SEED_SECRET
  if (seedSecret) {
    const providedSecret = request.headers.get('x-dev-seed-secret')
    if (providedSecret !== seedSecret) {
      return NextResponse.json({ error: 'Invalid seed secret' }, { status: 403 })
    }
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
  } catch {
    return NextResponse.json(
      { error: 'Seed operation failed' },
      { status: 500 }
    )
  }
}
