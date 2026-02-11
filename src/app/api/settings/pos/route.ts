import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createPosSchema = z.object({
  provider: z.enum(['square', 'sumup', 'lightspeed', 'toast', 'custom']),
  name: z.string().min(1).max(255),
  config: z.record(z.unknown()).default({}),
  sync_catalog: z.boolean().default(true),
  sync_orders: z.boolean().default(true),
  sync_payments: z.boolean().default(true),
  sync_inventory: z.boolean().default(false),
})

export async function GET() {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos_integrations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const validation = createPosSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos_integrations')
    .insert({ ...validation.data, created_by: authResult.data.user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
