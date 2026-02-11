import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating DJ
const djSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  genre: z.string().max(100).optional(),
  fee: z.number().min(0).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  social_links: z.string().optional(),
  rider_notes: z.string().optional(),
})

/**
 * GET /api/events/djs
 * List all DJs (managers/admins/dj role only)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'dj'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filter: search by name or genre
  const search = searchParams.get('search')
  const genre = searchParams.get('genre')

  let query = supabase
    .from('djs')
    .select('*')
    .order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (genre) {
    query = query.ilike('genre', `%${genre}%`)
  }

  const { data: djs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(djs)
}

/**
 * POST /api/events/djs
 * Create a new DJ (managers/admins only)
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
  const validation = djSchema.safeParse(body)
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

  // Check if DJ with same name already exists
  const { data: existingDj } = await supabase
    .from('djs')
    .select('id')
    .eq('name', validation.data.name)
    .single()

  if (existingDj) {
    return NextResponse.json(
      { error: 'DJ with this name already exists' },
      { status: 400 }
    )
  }

  // Create DJ record
  const { data: newDj, error } = await supabase
    .from('djs')
    .insert(validation.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newDj, { status: 201 })
}
