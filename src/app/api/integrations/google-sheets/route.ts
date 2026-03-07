import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/auth'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/integrations/google-sheets
 * Push monthly sales, expenses, and hours data to configured Google Sheet.
 * Requires GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY env vars.
 * Gracefully skips when not configured.
 */
export async function POST(request: Request) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const sheetsId = process.env.GOOGLE_SHEETS_ID
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!sheetsId || !serviceAccountKey) {
    return NextResponse.json({
      skipped: true,
      reason: 'Google Sheets not configured (GOOGLE_SHEETS_ID or GOOGLE_SERVICE_ACCOUNT_KEY missing)',
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7) // YYYY-MM

    const [year, monthNum] = month.split('-').map(Number)
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`
    const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10)

    const supabase = createAdminClient()

    // Fetch monthly sales
    const { data: sales } = await supabase
      .from('daily_sales')
      .select('date, total_revenue, total_transactions')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    // Fetch monthly expenses
    const { data: expenses } = await supabase
      .from('overhead_expenses')
      .select('date, amount, category, description')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    // Fetch monthly clock hours
    const { data: clockRecords } = await supabase
      .from('clock_in_out')
      .select('clock_in, clock_out, employee_id')
      .gte('clock_in', startDate)
      .lte('clock_in', endDate + 'T23:59:59')

    // Calculate totals
    const totalRevenue = (sales || []).reduce((s, r) => s + (r.total_revenue || 0), 0)
    const totalExpenses = (expenses || []).reduce((s, r) => s + (r.amount || 0), 0)
    const totalHours = (clockRecords || []).reduce((s, r) => {
      if (!r.clock_in || !r.clock_out) return s
      const hours = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 3600000
      return s + hours
    }, 0)

    // Prepare rows for Google Sheets
    const rows = [
      ['Month', 'Total Revenue (€)', 'Total Expenses (€)', 'Total Hours', 'Net (€)'],
      [month, totalRevenue.toFixed(2), totalExpenses.toFixed(2), totalHours.toFixed(1), (totalRevenue - totalExpenses).toFixed(2)],
    ]

    // Push to Google Sheets via Sheets API v4
    const serviceAccount = JSON.parse(serviceAccountKey)

    // Get OAuth2 token using JWT (service account)
    const jwt = await createServiceAccountJWT(serviceAccount)
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenRes.ok) {
      throw new Error('Failed to get Google OAuth token')
    }

    const { access_token } = await tokenRes.json()

    // Append rows to sheet
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/A1:E2:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    )

    if (!appendRes.ok) {
      throw new Error('Failed to append data to Google Sheet')
    }

    return NextResponse.json({
      success: true,
      month,
      rows_pushed: rows.length,
      summary: {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        total_hours: totalHours,
      },
    })
  } catch (error) {
    console.error('Google Sheets integration error:', error)
    return NextResponse.json(
      { error: 'Failed to push data to Google Sheets' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integrations/google-sheets
 * Returns configuration status
 */
export async function GET() {
  const authResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const configured = !!(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  return NextResponse.json({ configured, sheet_id: configured ? process.env.GOOGLE_SHEETS_ID : null })
}

/**
 * Create a signed JWT for Google service account OAuth2
 */
async function createServiceAccountJWT(serviceAccount: {
  client_email: string
  private_key: string
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const unsigned = `${encode(header)}.${encode(payload)}`

  // Import the RSA private key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n')
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(unsigned)
  )

  const sigBase64 = Buffer.from(signature).toString('base64url')
  return `${unsigned}.${sigBase64}`
}
