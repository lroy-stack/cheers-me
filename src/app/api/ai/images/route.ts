import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/ai/images
 * Returns user's AI-generated images with optional filtering.
 *
 * Query params:
 *  - purpose: filter by purpose (social_post, menu_item, event_promo, marketing, general)
 *  - search: search by prompt text (case-insensitive)
 *  - limit: max results (default 50, max 200)
 *  - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const purpose = searchParams.get('purpose')
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  let query = supabase
    .from('ai_generated_images')
    .select('id, prompt, purpose, public_url, storage_path, conversation_id, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (purpose && purpose !== 'all') {
    query = query.eq('purpose', purpose)
  }

  if (search) {
    query = query.ilike('prompt', `%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Gallery fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }

  return NextResponse.json({
    images: data || [],
    total: count || 0,
    limit,
    offset,
  })
}

/**
 * DELETE /api/ai/images
 * Delete a user's generated image by ID.
 *
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  // Verify ownership and get storage path
  const { data: image } = await supabase
    .from('ai_generated_images')
    .select('id, storage_path')
    .eq('id', body.id)
    .eq('user_id', user.id)
    .single()

  if (!image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  // Delete from storage (non-critical)
  if (image.storage_path) {
    await supabase.storage.from('ai-generated-images').remove([image.storage_path])
  }

  // Delete DB record
  const { error } = await supabase
    .from('ai_generated_images')
    .delete()
    .eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
