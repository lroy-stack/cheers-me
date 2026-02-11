import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating content calendar entry
const updateContentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  content_text: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  platform: z.enum(['instagram', 'facebook', 'multi']).optional().nullable(),
  scheduled_date: z.string().datetime().optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
  language: z.enum(['nl', 'en', 'es']).optional().nullable(),
})

/**
 * GET /api/marketing/content-calendar/[id]
 * Get a single content calendar entry by ID (managers/admins only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: content, error } = await supabase
    .from('content_calendar')
    .select(`
      *,
      created_by_employee:employees!content_calendar_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      ),
      social_posts(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(content)
}

/**
 * PATCH /api/marketing/content-calendar/[id]
 * Update a content calendar entry (managers/admins only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateContentSchema.safeParse(body)
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

  // Update content calendar entry
  const { data: updatedContent, error } = await supabase
    .from('content_calendar')
    .update(validation.data)
    .eq('id', id)
    .select(`
      *,
      created_by_employee:employees!content_calendar_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedContent)
}

/**
 * DELETE /api/marketing/content-calendar/[id]
 * Delete a content calendar entry (managers/admins only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  // Delete content calendar entry (CASCADE will delete related social_posts)
  const { error } = await supabase
    .from('content_calendar')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
