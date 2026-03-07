import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const NOTIFICATION_TYPES = [
  'shift_reminder',
  'schedule_change',
  'leave_approved',
  'leave_rejected',
  'task_assigned',
  'training_due',
  'stock_alert',
  'reservation_new',
  'reservation_cancelled',
  'birthday_alert',
] as const

const CHANNELS = ['in_app', 'email'] as const

/**
 * GET /api/settings/notifications
 * Returns notification preferences for the current user
 */
export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  const { data: userData } = authResult

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('type, channel, enabled')
    .eq('user_id', userData.profile.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }

  // Build structured response with defaults (all enabled)
  const prefs: Record<string, Record<string, boolean>> = {}
  for (const type of NOTIFICATION_TYPES) {
    prefs[type] = {}
    for (const ch of CHANNELS) {
      prefs[type][ch] = true // default: enabled
    }
  }
  for (const row of data || []) {
    if (prefs[row.type]) {
      prefs[row.type][row.channel] = row.enabled
    }
  }

  return NextResponse.json({ preferences: prefs, types: NOTIFICATION_TYPES, channels: CHANNELS })
}

const patchSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(CHANNELS),
  enabled: z.boolean(),
})

/**
 * PATCH /api/settings/notifications
 * Upsert a single notification preference
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  const { data: userData } = authResult

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const { type, channel, enabled } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userData.profile.id, type, channel, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,type,channel' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
