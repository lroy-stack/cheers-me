import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { format } from 'date-fns'

/**
 * GET /api/crm/customers/export
 * Export customer data as CSV. Requires manager+ role.
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = createAdminClient()

  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, visit_count, total_spent, vip, birthday, preferences, notes, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }

  const rows = customers ?? []

  // Build CSV
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Visits', 'Total Spent (EUR)', 'VIP', 'Birthday', 'Preferences', 'Notes', 'Created At']
  const csvRows = [
    headers.join(','),
    ...rows.map(c => [
      c.id,
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      `"${(c.email ?? '').replace(/"/g, '""')}"`,
      `"${(c.phone ?? '').replace(/"/g, '""')}"`,
      c.visit_count ?? 0,
      Number(c.total_spent ?? 0).toFixed(2),
      c.vip ? 'Yes' : 'No',
      c.birthday ? format(new Date(c.birthday), 'yyyy-MM-dd') : '',
      `"${(c.preferences ?? '').replace(/"/g, '""')}"`,
      `"${(c.notes ?? '').replace(/"/g, '""')}"`,
      c.created_at ? format(new Date(c.created_at), 'yyyy-MM-dd') : '',
    ].join(',')),
  ]

  const csv = csvRows.join('\n')
  const filename = `customers_${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
