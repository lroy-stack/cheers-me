import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/crm/customers/[id]/erase
 * GDPR Art. 17 — Right to Erasure.
 * Admin-only endpoint that:
 *   1. Anonymises customer PII (name, email, phone → [DELETED])
 *   2. Hard-deletes newsletter subscriber record
 *   3. Marks data_request as completed (if request_id provided)
 *   4. Preserves financial records for Art. 17(3)(b) 4-year retention
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Look up the customer
  const { data: customer, error: lookupErr } = await supabase
    .from('customers')
    .select('id, email, full_name')
    .eq('id', id)
    .single()

  if (lookupErr || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // 1. Anonymise customer PII
  const { error: anonymiseErr } = await supabase
    .from('customers')
    .update({
      full_name: '[DELETED]',
      email: `deleted-${id}@erased.invalid`,
      phone: '[DELETED]',
      notes: null,
      // Preserve: id, created_at, visit_count, total_spent (financial)
    })
    .eq('id', id)

  if (anonymiseErr) {
    console.error('[erase] anonymise error:', anonymiseErr.code)
    return NextResponse.json({ error: 'Failed to anonymise customer' }, { status: 500 })
  }

  // 2. Hard-delete newsletter subscriber if found by email
  if (customer.email) {
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('email', customer.email)
  }

  // 3. If a data_request id is provided, mark it completed
  let body: { request_id?: string } = {}
  try { body = await request.json() } catch { /* no body */ }

  if (body.request_id) {
    await supabase
      .from('data_requests')
      .update({
        status: 'completed',
        processed_by: authResult.data.user.id,
        processed_at: new Date().toISOString(),
        notes: `Customer ${id} anonymised. Financial records retained.`,
      })
      .eq('id', body.request_id)
  }

  return NextResponse.json({
    success: true,
    message: 'Customer PII erased. Financial records preserved per GDPR Art. 17(3)(b).',
  })
}
