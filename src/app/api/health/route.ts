import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/health
 * Returns service health status including DB connectivity check.
 * Used by uptime monitors and load balancers.
 * No auth required — public endpoint.
 */
export async function GET() {
  const startTime = Date.now()

  let dbStatus: 'connected' | 'error' = 'error'
  let dbLatencyMs: number | undefined

  try {
    const supabase = createAdminClient()
    const dbStart = Date.now()
    // Simple connectivity check — query a lightweight system table
    const { error } = await supabase.from('profiles').select('id').limit(1)
    dbLatencyMs = Date.now() - dbStart

    if (!error) {
      dbStatus = 'connected'
    }
  } catch {
    // DB unreachable
  }

  const totalMs = Date.now() - startTime
  const healthy = dbStatus === 'connected'

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      db: dbStatus,
      latency_ms: dbLatencyMs,
      total_ms: totalMs,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
