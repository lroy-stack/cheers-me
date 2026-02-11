import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const postSchema = z.object({
  document_type: z.string().min(1).max(100),
  document_id: z.string().uuid(),
  signature_data: z.string().min(1),
})

/**
 * POST /api/signatures
 * Save a digital signature record
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter', 'bar'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = postSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { document_type, document_id, signature_data } = validation.data

  const supabase = await createClient()

  // For now, store the data URL directly in signature_url.
  // In production, upload to Supabase storage and store the public URL instead.
  const { data, error } = await supabase
    .from('digital_signatures')
    .insert({
      document_type,
      document_id,
      signature_url: signature_data,
      user_id: authResult.data.user.id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'digital_signatures table not configured. Run the appropriate migration.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

/**
 * GET /api/signatures
 * Fetch signatures for a specific document
 * Query params: document_type, document_id
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter', 'bar'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const document_type = searchParams.get('document_type')
  const document_id = searchParams.get('document_id')

  if (!document_type || !document_id) {
    return NextResponse.json(
      { error: 'document_type and document_id query parameters are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('digital_signatures')
    .select('*')
    .eq('document_type', document_type)
    .eq('document_id', document_id)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
