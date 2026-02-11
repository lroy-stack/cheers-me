import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for QR code generation
const qrCodeSchema = z.object({
  table_id: z.string().uuid(),
  base_url: z.string().url().optional(), // Optional custom base URL
})

/**
 * POST /api/tables/qr-code
 * Generate a QR code URL for a table's digital menu (managers/admins only)
 * Uses local QR generation via /api/tables/[id]/qr-image instead of quickchart.io
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = qrCodeSchema.safeParse(body)
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

  // Verify table exists
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, table_number')
    .eq('id', validation.data.table_id)
    .single()

  if (tableError || !table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  // Generate digital menu URL for this table
  const baseUrl = validation.data.base_url || process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheersmallorca.com'
  const menuUrl = `${baseUrl}/menu/digital?table=${table.table_number}`

  // Use local QR generation API route (styled with logo)
  const qrCodeUrl = `/api/tables/${table.id}/qr-image`

  // Update table with QR code URL and generation timestamp
  const { data: updatedTable, error: updateError } = await supabase
    .from('tables')
    .update({
      qr_code_url: qrCodeUrl,
      qr_generated_at: new Date().toISOString(),
    })
    .eq('id', validation.data.table_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    table_id: updatedTable.id,
    table_number: updatedTable.table_number,
    qr_code_url: qrCodeUrl,
    menu_url: menuUrl,
  }, { status: 201 })
}

/**
 * GET /api/tables/qr-code
 * Bulk generate QR codes for all tables (managers/admins only)
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Get all tables
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, table_number, qr_code_url')
    .order('table_number', { ascending: true })

  if (tablesError) {
    return NextResponse.json({ error: tablesError.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheersmallorca.com'
  const results = []
  const now = new Date().toISOString()

  for (const table of tables || []) {
    const menuUrl = `${baseUrl}/menu/digital?table=${table.table_number}`
    const qrCodeUrl = `/api/tables/${table.id}/qr-image`

    const { error: updateError } = await supabase
      .from('tables')
      .update({
        qr_code_url: qrCodeUrl,
        qr_generated_at: now,
      })
      .eq('id', table.id)

    if (updateError) {
      results.push({
        table_id: table.id,
        table_number: table.table_number,
        success: false,
        error: updateError.message,
      })
    } else {
      results.push({
        table_id: table.id,
        table_number: table.table_number,
        success: true,
        qr_code_url: qrCodeUrl,
        menu_url: menuUrl,
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return NextResponse.json({
    success: true,
    total: results.length,
    generated: successCount,
    errors: errorCount,
    results,
  })
}
