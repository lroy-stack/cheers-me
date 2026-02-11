import { createClient } from '@/lib/supabase/server'
import { generateStyledQR } from '@/lib/utils/qr-code'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tables/[id]/qr-image
 * Generate and return a styled QR code PNG for a table's digital menu
 * Public endpoint (QR images are not secret)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch table
  const { data: table, error } = await supabase
    .from('tables')
    .select('id, table_number')
    .eq('id', id)
    .single()

  if (error || !table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  }

  // Build menu URL
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheersmallorca.com'
  const menuUrl = `${baseUrl}/menu/digital?table=${table.table_number}`

  // Generate styled QR with logo
  const qrBuffer = await generateStyledQR(menuUrl)

  return new NextResponse(new Uint8Array(qrBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="qr-${table.table_number}.png"`,
    },
  })
}
