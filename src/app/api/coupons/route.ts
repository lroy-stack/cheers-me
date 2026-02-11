import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coupons — List all coupons for staff (manager+)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const supabase = await createClient()
  let query = supabase
    .from('gift_coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (search) {
    query = query.or(`code.ilike.%${search}%,purchaser_name.ilike.%${search}%,purchaser_email.ilike.%${search}%,recipient_name.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
