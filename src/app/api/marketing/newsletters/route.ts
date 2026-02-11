import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating newsletter
const createNewsletterSchema = z.object({
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  html_content: z.string().optional().nullable(),
  segment: z.enum(['all', 'vip', 'language_nl', 'language_en', 'language_es']).default('all'),
  scheduled_date: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'sent', 'failed']).default('draft'),
})


/**
 * GET /api/marketing/newsletters
 * List all newsletters (managers/admins only)
 * Query params:
 * - status: filter by status (draft, scheduled, sent, failed)
 * - segment: filter by audience segment
 * - from: filter by scheduled_date >= from (ISO date)
 * - to: filter by scheduled_date <= to (ISO date)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Build query with optional filters
  let query = supabase
    .from('newsletters')
    .select(`
      *,
      created_by_employee:employees!newsletters_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  const status = searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const segment = searchParams.get('segment')
  if (segment) {
    query = query.eq('segment', segment)
  }

  const from = searchParams.get('from')
  if (from) {
    query = query.gte('scheduled_date', from)
  }

  const to = searchParams.get('to')
  if (to) {
    query = query.lte('scheduled_date', to)
  }

  const { data: newsletters, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newsletters)
}

/**
 * POST /api/marketing/newsletters
 * Create a new newsletter (managers/admins only)
 */
export async function POST(request: NextRequest) {
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
  const validation = createNewsletterSchema.safeParse(body)
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

  // Get employee record for created_by
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  // Create newsletter
  const { data: newNewsletter, error } = await supabase
    .from('newsletters')
    .insert({
      ...validation.data,
      created_by: employee?.id || null,
      recipient_count: 0, // Will be updated when sent
    })
    .select(`
      *,
      created_by_employee:employees!newsletters_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newNewsletter, { status: 201 })
}
