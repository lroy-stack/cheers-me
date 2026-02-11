import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for CSV import row
const csvRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  food_revenue: z.number().min(0).default(0),
  drinks_revenue: z.number().min(0).default(0),
  cocktails_revenue: z.number().min(0).default(0),
  desserts_revenue: z.number().min(0).default(0),
  other_revenue: z.number().min(0).default(0),
  tips: z.number().min(0).default(0),
  ticket_count: z.number().int().min(0).default(0),
})

// Import request schema
const importRequestSchema = z.object({
  data: z.array(csvRowSchema).min(1).max(365), // Max 1 year of data at once
  import_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  file_name: z.string().optional(),
})

/**
 * POST /api/sales/import
 * Import sales data from CSV (batch upsert)
 * Accessible by: admin, manager
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = importRequestSchema.safeParse(body)
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

  // Get the employee ID for the current user
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  let rowsImported = 0
  let rowsFailed = 0
  const errorLog: string[] = []
  let totalRevenue = 0

  // Process each row
  for (const row of validation.data.data) {
    try {
      // Calculate total revenue for this row
      const rowTotal =
        row.food_revenue +
        row.drinks_revenue +
        row.cocktails_revenue +
        row.desserts_revenue +
        row.other_revenue

      totalRevenue += rowTotal

      // Upsert the daily sales record
      const { error: upsertError } = await supabase
        .from('daily_sales')
        .upsert(
          {
            date: row.date,
            food_revenue: row.food_revenue,
            drinks_revenue: row.drinks_revenue,
            cocktails_revenue: row.cocktails_revenue,
            desserts_revenue: row.desserts_revenue,
            other_revenue: row.other_revenue,
            tips: row.tips,
            total_revenue: rowTotal,
            ticket_count: row.ticket_count,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'date',
          }
        )

      if (upsertError) {
        rowsFailed++
        errorLog.push(`${row.date}: ${upsertError.message}`)
      } else {
        rowsImported++
      }
    } catch (error) {
      rowsFailed++
      errorLog.push(`${row.date}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Create import log
  const { data: importLog, error: logError } = await supabase
    .from('sales_import_logs')
    .insert({
      import_date: validation.data.import_date,
      file_name: validation.data.file_name || null,
      rows_imported: rowsImported,
      rows_failed: rowsFailed,
      total_revenue: totalRevenue,
      imported_by: employee?.id || null,
      error_log: errorLog.length > 0 ? errorLog.join('\n') : null,
    })
    .select()
    .single()

  if (logError) {
    console.error('Failed to create import log:', logError)
  }

  return NextResponse.json({
    success: rowsFailed === 0,
    message: `Import completed: ${rowsImported} rows imported, ${rowsFailed} rows failed`,
    rows_imported: rowsImported,
    rows_failed: rowsFailed,
    total_revenue: totalRevenue,
    errors: errorLog,
    import_log: importLog,
  }, { status: rowsFailed === 0 ? 201 : 207 }) // 207 Multi-Status if partial success
}

/**
 * GET /api/sales/import
 * List import logs
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20

  const { data: logs, error } = await supabase
    .from('sales_import_logs')
    .select(`
      *,
      imported_by_employee:employees!imported_by(
        id,
        profile:profiles(
          full_name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(logs)
}
