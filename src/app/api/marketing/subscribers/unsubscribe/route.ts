import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHmac, timingSafeEqual } from 'crypto'

// ============================================================
// HMAC helper
// ============================================================

function getHmacSecret(): string {
  const secret = process.env.NEWSLETTER_HMAC_SECRET
  if (!secret) throw new Error('NEWSLETTER_HMAC_SECRET not set')
  return secret
}

/**
 * Generate an HMAC-signed unsubscribe token for a subscriber ID.
 * Token format (base64url): `<subscriberId>.<hmacHex>`
 * Use this when generating unsubscribe links in email templates.
 */
export function generateUnsubscribeToken(subscriberId: string): string {
  const mac = createHmac('sha256', getHmacSecret())
    .update(subscriberId)
    .digest('hex')
  return Buffer.from(`${subscriberId}.${mac}`).toString('base64url')
}

/**
 * Verify an HMAC-signed unsubscribe token.
 * Returns the subscriber ID on success, null on failure.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const dotIdx = decoded.indexOf('.')
    if (dotIdx === -1) return null
    const subscriberId = decoded.slice(0, dotIdx)
    const providedMac = decoded.slice(dotIdx + 1)

    const expectedMac = createHmac('sha256', getHmacSecret())
      .update(subscriberId)
      .digest('hex')

    const provided = Buffer.from(providedMac, 'hex')
    const expected = Buffer.from(expectedMac, 'hex')
    if (provided.length !== expected.length) return null
    if (!timingSafeEqual(provided, expected)) return null

    return subscriberId
  } catch {
    return null
  }
}

// ============================================================
// POST /api/marketing/subscribers/unsubscribe
// Body: { token: string } (HMAC)  OR  { email: string } (legacy)
// Returns identical message regardless of whether subscriber found.
// ============================================================

const postSchemaToken = z.object({ token: z.string().min(1) })
const postSchemaEmail = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = await createClient()
  const GENERIC_SUCCESS = { success: true, message: 'Unsubscribe processed' }

  // Try HMAC token path first (preferred)
  const tokenResult = postSchemaToken.safeParse(body)
  if (tokenResult.success) {
    const subscriberId = verifyUnsubscribeToken(tokenResult.data.token)
    if (!subscriberId) {
      // Invalid token — same generic response to prevent enumeration
      return NextResponse.json(GENERIC_SUCCESS)
    }
    await supabase
      .from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('id', subscriberId)
    return NextResponse.json(GENERIC_SUCCESS)
  }

  // Legacy: email-based unsubscribe
  const emailResult = postSchemaEmail.safeParse(body)
  if (!emailResult.success) {
    return NextResponse.json({ error: 'Provide token or valid email' }, { status: 400 })
  }

  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('email', emailResult.data.email)
    .single()

  if (subscriber) {
    await supabase
      .from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('id', subscriber.id)
  }

  // Same response whether found or not (prevent email enumeration)
  return NextResponse.json(GENERIC_SUCCESS)
}

// ============================================================
// GET /api/marketing/subscribers/unsubscribe
// Query: ?token=<hmac_token>  OR  ?email=<email>  (click from email)
// Returns HTML confirmation page.
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token && !email) {
    return htmlPage(400, 'Invalid Link', '<p class="error">Unsubscribe link is missing required parameters.</p>')
  }

  const supabase = await createClient()
  let subscriberId: string | null = null

  if (token) {
    // Try HMAC-signed token first
    subscriberId = verifyUnsubscribeToken(token)

    // Fallback: legacy UUID stored in unsubscribe_token column
    if (!subscriberId) {
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('id')
        .eq('unsubscribe_token', token)
        .single()
      if (data) subscriberId = data.id
    }
  } else if (email) {
    const emailOk = z.string().email().safeParse(email)
    if (!emailOk.success) {
      return htmlPage(400, 'Invalid Email', '<p class="error">The email address in this link is not valid.</p>')
    }
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', emailOk.data)
      .single()
    if (data) subscriberId = data.id
  }

  // Perform unsubscribe (or silently succeed if not found — prevent enumeration)
  if (subscriberId) {
    await supabase
      .from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('id', subscriberId)
  }

  // Always return success page (same response for found/not-found)
  return htmlPage(200, '✓ Unsubscribed',
    `<p class="success">If that address was subscribed, it has now been removed.</p>
     <p class="info">We're sorry to see you go. You can always subscribe again on our website. 🍻</p>`
  )
}

function htmlPage(status: number, title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — GrandCafe Cheers</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:60px auto;padding:20px;text-align:center;background:#0f0a0c;color:#f5f0ee}
    h1{color:#e8a030;margin-bottom:16px}
    .success{color:#4ade80}.error{color:#f87171}.info{color:#94a3b8;margin-top:12px}
  </style>
</head>
<body><h1>${title}</h1>${body}</body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  )
}
