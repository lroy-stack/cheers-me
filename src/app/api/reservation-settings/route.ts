import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating reservation settings
const updateSettingsSchema = z.object({
  slot_duration_minutes: z.number().int().min(15).max(120).optional(),
  max_advance_booking_days: z.number().int().min(1).max(365).optional(),
  min_advance_booking_hours: z.number().int().min(0).max(72).optional(),
  auto_release_no_show_minutes: z.number().int().min(5).max(60).optional(),
  require_confirmation: z.boolean().optional(),
  allow_online_booking: z.boolean().optional(),
  max_party_size: z.number().int().min(1).max(100).optional(),
})

/**
 * GET /api/reservation-settings
 * Get current reservation settings
 * Access: admin, manager, owner (view), waiter (limited view)
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Reservation settings is a single-row table
  const { data: settings, error } = await supabase
    .from('reservation_settings')
    .select('*')
    .single()

  if (error) {
    // If no settings exist, create default settings
    if (error.code === 'PGRST116') {
      const { data: newSettings, error: insertError } = await supabase
        .from('reservation_settings')
        .insert({
          slot_duration_minutes: 60,
          max_advance_booking_days: 30,
          min_advance_booking_hours: 2,
          auto_release_no_show_minutes: 15,
          require_confirmation: true,
          allow_online_booking: true,
          max_party_size: 12,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json(newSettings)
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}

/**
 * PUT /api/reservation-settings
 * Update reservation settings (single row update)
 * Access: admin, manager
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateSettingsSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get the single settings row
  const { data: existingSettings } = await supabase
    .from('reservation_settings')
    .select('id')
    .single()

  if (!existingSettings) {
    return NextResponse.json(
      { error: 'Reservation settings not found. Please contact support.' },
      { status: 500 }
    )
  }

  // Update the settings
  const { data: updatedSettings, error } = await supabase
    .from('reservation_settings')
    .update(validation.data)
    .eq('id', existingSettings.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedSettings)
}
