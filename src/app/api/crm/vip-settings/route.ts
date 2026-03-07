import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  visit_threshold: z.number().int().min(1).max(1000).optional(),
  spent_threshold: z.number().min(0).optional(),
  auto_promote_enabled: z.boolean().optional(),
})

/**
 * GET /api/crm/vip-settings
 */
export async function GET() {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vip_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch VIP settings' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/crm/vip-settings
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Get existing record first
  const { data: existing } = await supabase
    .from('vip_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'VIP settings not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('vip_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update VIP settings' }, { status: 500 })
  }

  return NextResponse.json(data)
}
