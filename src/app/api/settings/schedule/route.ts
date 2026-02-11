import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * GET /api/settings/schedule
 * Fetch all restaurant settings as a merged object
 */
export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('restaurant_settings')
    .select('key, value')

  if (error) {
    // Return empty settings on any DB error (table not found, RLS, etc.)
    // The client hook will apply defaults
    console.warn('[settings/schedule] GET error:', error.code, error.message)
    return NextResponse.json({})
  }

  // Merge into single object
  const settings: Record<string, unknown> = {}
  for (const row of rows || []) {
    settings[row.key] = row.value
  }

  return NextResponse.json(settings)
}

const patchSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
})

/**
 * PATCH /api/settings/schedule
 * Upsert a single setting by key
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = patchSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('restaurant_settings')
    .upsert(
      {
        key: validation.data.key,
        value: validation.data.value as Record<string, unknown>,
        updated_by: authResult.data.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) {
    console.warn('[settings/schedule] PATCH error:', error.code, error.message)
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'Settings table not configured. Run migration 018_spanish_compliance_settings.sql' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: `Database error (${error.code || 'unknown'}): ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
