import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/staff/compliance/stats
 * Dashboard statistics for compliance records
 * Auth: admin/manager/owner only
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Calculate start of this week (Monday) and start of this month
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - mondayOffset)
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  startOfMonth.setHours(0, 0, 0, 0)

  try {
    // Total records count
    const { count: totalRecords, error: totalError } = await supabase
      .from('compliance_records')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      return NextResponse.json({ error: totalError.message }, { status: 500 })
    }

    // Records this week
    const { count: recordsThisWeek, error: weekError } = await supabase
      .from('compliance_records')
      .select('*', { count: 'exact', head: true })
      .gte('recorded_at', startOfWeek.toISOString())

    if (weekError) {
      return NextResponse.json({ error: weekError.message }, { status: 500 })
    }

    // Records this month
    const { count: recordsThisMonth, error: monthError } = await supabase
      .from('compliance_records')
      .select('*', { count: 'exact', head: true })
      .gte('recorded_at', startOfMonth.toISOString())

    if (monthError) {
      return NextResponse.json({ error: monthError.message }, { status: 500 })
    }

    // Flagged count
    const { count: flaggedCount, error: flaggedError } = await supabase
      .from('compliance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'flagged')

    if (flaggedError) {
      return NextResponse.json({ error: flaggedError.message }, { status: 500 })
    }

    // Pending review count
    const { count: pendingReviewCount, error: pendingError } = await supabase
      .from('compliance_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'requires_review')

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    // By category: fetch records joined with ficha types
    const { data: recordsWithTypes, error: catError } = await supabase
      .from('compliance_records')
      .select('ficha_type_code, ficha_type:compliance_ficha_types(category)')

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 })
    }

    // Group by category
    const categoryMap: Record<string, number> = {}
    for (const record of recordsWithTypes || []) {
      const fichaType = record.ficha_type as unknown as { category: string } | null
      const category = fichaType?.category || 'general'
      categoryMap[category] = (categoryMap[category] || 0) + 1
    }

    const byCategory = Object.entries(categoryMap).map(
      ([category, count]) => ({ category, count })
    )

    // By type: group by ficha_type_code
    const { data: recordsByType, error: typeError } = await supabase
      .from('compliance_records')
      .select('ficha_type_code, ficha_type:compliance_ficha_types(name_en)')

    if (typeError) {
      return NextResponse.json({ error: typeError.message }, { status: 500 })
    }

    const typeMap: Record<string, { name: string; count: number }> = {}
    for (const record of recordsByType || []) {
      const code = record.ficha_type_code
      const fichaType = record.ficha_type as unknown as { name_en: string } | null
      if (!typeMap[code]) {
        typeMap[code] = {
          name: fichaType?.name_en || code,
          count: 0,
        }
      }
      typeMap[code].count++
    }

    const byType = Object.entries(typeMap).map(
      ([ficha_type_code, { name, count }]) => ({
        ficha_type_code,
        name,
        count,
      })
    )

    // Build byCategory as a Record<category, count>
    const byCategoryRecord: Record<string, number> = {}
    for (const item of byCategory) {
      byCategoryRecord[item.category] = item.count
    }

    return NextResponse.json({
      totalRecords: totalRecords || 0,
      recordsThisWeek: recordsThisWeek || 0,
      recordsThisMonth: recordsThisMonth || 0,
      flaggedCount: flaggedCount || 0,
      pendingReviewCount: pendingReviewCount || 0,
      byCategory: byCategoryRecord,
      byType: byType.map((t) => ({ code: t.ficha_type_code, name: t.name, count: t.count })),
    })
  } catch (err) {
    console.error('Compliance stats error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch compliance statistics' },
      { status: 500 }
    )
  }
}
