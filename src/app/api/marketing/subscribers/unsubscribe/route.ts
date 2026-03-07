import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for unsubscribe request
const unsubscribeSchema = z.object({
  email: z.string().email(),
})

/**
 * POST /api/marketing/subscribers/unsubscribe
 * Public endpoint for unsubscribing from newsletter
 * No authentication required - this is accessed via email unsubscribe links
 *
 * Security: Uses email matching only. Consider adding a signed token in production.
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = unsubscribeSchema.safeParse(body)
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

  // Find subscriber by email
  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', validation.data.email)
    .single()

  if (!subscriber) {
    return NextResponse.json(
      { error: 'Email not found in subscriber list' },
      { status: 404 }
    )
  }

  if (!subscriber.is_active) {
    return NextResponse.json(
      { message: 'Already unsubscribed' },
      { status: 200 }
    )
  }

  // Unsubscribe user
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Successfully unsubscribed from newsletter',
  }, { status: 200 })
}

/**
 * GET /api/marketing/subscribers/unsubscribe
 * Public endpoint for one-click unsubscribe via email link
 * Feature: S1D.C3 — Fix broken unsubscribe link (token vs email mismatch)
 * Usage (preferred): /api/marketing/subscribers/unsubscribe?token={unsubscribe_token}
 * Usage (legacy):    /api/marketing/subscribers/unsubscribe?email=user@example.com
 *
 * Returns HTML page confirming unsubscription
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token && !email) {
    return htmlResponse(400, 'Invalid Link', '<p class="error">Unsubscribe link is missing required parameters.</p>')
  }

  const supabase = await createClient()

  // Find subscriber — prefer token lookup (new), fall back to email (legacy)
  let subscriberResult: { id: string; is_active: boolean } | null = null

  if (token) {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('unsubscribe_token', token)
      .single()
    subscriberResult = data
  } else if (email) {
    const emailValidation = z.string().email().safeParse(email)
    if (!emailValidation.success) {
      return htmlResponse(400, 'Invalid Email', '<p class="error">The provided email address is not valid.</p>')
    }
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', email)
      .single()
    subscriberResult = data
  }

  if (!subscriberResult) {
    return htmlResponse(404, 'Not Found', '<p class="info">This unsubscribe link is invalid or the email is not in our subscriber list.</p>')
  }

  if (!subscriberResult.is_active) {
    return htmlResponse(200, 'Already Unsubscribed',
      '<p class="success">This email address has already been unsubscribed from our newsletter.</p><p>If you\'d like to subscribe again, please visit our website.</p>'
    )
  }

  // Unsubscribe user
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', subscriberResult.id)

  if (error) {
    return htmlResponse(500, 'Unsubscribe Failed', '<p class="error">An error occurred while unsubscribing. Please try again later.</p>')
  }

  return htmlResponse(200, '✓ Successfully Unsubscribed',
    `<p class="success">You have been unsubscribed from the GrandCafe Cheers newsletter.</p>
     <p class="info">We're sorry to see you go. If you change your mind, you can always subscribe again on our website.</p>
     <p class="info">Thank you for being part of our community! 🍻</p>`
  )
}

function htmlResponse(status: number, title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — GrandCafe Cheers Newsletter</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 60px auto; padding: 20px; text-align: center; background: #0f0a0c; color: #f5f0ee; }
    h1 { color: #e8a030; margin-bottom: 16px; }
    .success { color: #4ade80; }
    .error { color: #f87171; }
    .info { color: #94a3b8; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  )
}
