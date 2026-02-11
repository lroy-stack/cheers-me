import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for profile updates
const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  language: z.enum(['en', 'nl', 'es', 'de']).optional(),
  emergency_contact: z.string().max(255).nullable().optional(),
  emergency_phone: z.string().max(20).nullable().optional(),
})

/**
 * GET /api/profile
 * Retrieve the current user's profile
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const adminClient = createAdminClient()

  // Fetch full profile with employee data if exists (admin client bypasses RLS)
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select(
      `
      *,
      employee:employees(
        id,
        hourly_rate,
        contract_type,
        date_hired,
        date_terminated
      )
    `
    )
    .eq('id', userData.user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}

/**
 * PATCH /api/profile
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateProfileSchema.safeParse(body)
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

  // Update profile
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userData.user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedProfile)
}
