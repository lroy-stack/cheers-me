import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating newsletter
const updateNewsletterSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  html_content: z.string().optional().nullable(),
  segment: z.enum(['all', 'vip', 'language_nl', 'language_en', 'language_es']).optional(),
  scheduled_date: z.string().datetime().optional().nullable(),
  sent_at: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'sent', 'failed']).optional(),
  recipient_count: z.number().int().min(0).optional(),
})

/**
 * GET /api/marketing/newsletters/[id]
 * Get a single newsletter by ID (managers/admins only)
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

  const { data: newsletter, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newsletter)
}

/**
 * PATCH /api/marketing/newsletters/[id]
 * Update a newsletter (managers/admins only)
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
  const validation = updateNewsletterSchema.safeParse(body)
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

  // Update newsletter
  const { data: updatedNewsletter, error } = await supabase
    .from('newsletters')
    .update(validation.data)
    .eq('id', id)
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
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedNewsletter)
}

/**
 * DELETE /api/marketing/newsletters/[id]
 * Delete a newsletter (managers/admins only)
 * Note: Only drafts can be deleted. Sent newsletters should be kept for records.
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

  // Check if newsletter is a draft
  const { data: newsletter } = await supabase
    .from('newsletters')
    .select('status')
    .eq('id', id)
    .single()

  if (!newsletter) {
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
  }

  if (newsletter.status === 'sent') {
    return NextResponse.json(
      { error: 'Cannot delete sent newsletters. They must be kept for records.' },
      { status: 400 }
    )
  }

  // Delete newsletter
  const { error } = await supabase
    .from('newsletters')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
