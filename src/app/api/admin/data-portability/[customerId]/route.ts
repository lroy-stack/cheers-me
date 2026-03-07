import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/data-portability/[customerId]
 * Export all personal data for a customer (GDPR data portability).
 * Returns JSON with all PII: profile, reservations, loyalty, reviews, preferences.
 * Accepts ?format=csv for flat CSV export.
 * Requires admin or owner role.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const authResult = await requireRole(['admin', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { customerId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  const supabase = createAdminClient()

  // Fetch customer profile
  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (custError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Fetch all related data in parallel
  const [
    { data: reservations },
    { data: loyaltyPoints },
    { data: loyaltyRewards },
    { data: reviews },
    { data: allergies },
    { data: tags },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, reservation_date, start_time, party_size, reservation_status, occasion, special_requests, created_at')
      .eq('customer_id', customerId)
      .order('reservation_date', { ascending: false }),
    supabase
      .from('loyalty_points')
      .select('points, transaction_type, description, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('loyalty_rewards')
      .select('reward_name, reward_value, redeemed_at, expires_at, status')
      .eq('customer_id', customerId),
    supabase
      .from('customer_reviews')
      .select('overall_rating, food_rating, service_rating, comment, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('customer_allergies')
      .select('allergen_id, allergens(name)')
      .eq('customer_id', customerId),
    supabase
      .from('customer_tags')
      .select('tag')
      .eq('customer_id', customerId),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      vip: customer.vip,
      total_visits: customer.total_visits,
      total_spent: customer.total_spent,
      loyalty_tier: customer.loyalty_tier,
      marketing_consent: customer.marketing_consent,
      preferred_language: customer.preferred_language,
      created_at: customer.created_at,
    },
    reservations: reservations ?? [],
    loyalty_points: loyaltyPoints ?? [],
    loyalty_rewards: loyaltyRewards ?? [],
    reviews: reviews ?? [],
    allergies: (allergies ?? []).map((a: { allergen_id: string; allergens: unknown }) => {
      const allergen = a.allergens as { name?: string } | null
      return { allergen_id: a.allergen_id, name: allergen?.name ?? '' }
    }),
    tags: (tags ?? []).map((t: { tag: string }) => t.tag),
  }

  if (format === 'csv') {
    // Flat CSV with customer info + reservation rows
    const rows: string[] = []
    rows.push('type,field,value')
    Object.entries(exportData.customer).forEach(([k, v]) => {
      rows.push(`customer,${k},"${String(v ?? '').replace(/"/g, '""')}"`)
    });
    (exportData.reservations as Record<string, unknown>[]).forEach((r, i) => {
      Object.entries(r).forEach(([k, v]) => {
        rows.push(`reservation_${i + 1},${k},"${String(v ?? '').replace(/"/g, '""')}"`)
      })
    })

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customer-data-${customerId}.csv"`,
      },
    })
  }

  return NextResponse.json(exportData)
}
