import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/marketing/subscribers/verify?token={verificationToken}
 * Public endpoint — activate newsletter subscription after email verification
 * Feature: S1D.C1 — Newsletter double opt-in
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse(
      buildHtml('Invalid Link', '<p class="error">Verification token is missing.</p>'),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    )
  }

  const supabase = await createClient()

  // Find subscriber by verification token
  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, is_active, verified_at')
    .eq('verification_token', token)
    .single()

  if (!subscriber) {
    return new NextResponse(
      buildHtml('Invalid Link', '<p class="error">This verification link is invalid or has already been used.</p>'),
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (subscriber.verified_at) {
    return new NextResponse(
      buildHtml('Already Verified', '<p class="success">Your email address has already been confirmed. You are subscribed to our newsletter!</p>'),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Activate subscriber
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: true,
      verified_at: new Date().toISOString(),
      verification_token: null, // consume token
    })
    .eq('id', subscriber.id)

  if (error) {
    return new NextResponse(
      buildHtml('Error', '<p class="error">An error occurred while confirming your subscription. Please try again.</p>'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }

  return new NextResponse(
    buildHtml(
      'Subscription Confirmed!',
      `<p class="success">Thank you! Your subscription to the GrandCafe Cheers newsletter has been confirmed.</p>
       <p class="info">You'll receive our latest news, events, and exclusive offers. See you at Cheers! 🍻</p>
       <a href="/" class="btn">Visit our website</a>`
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}

function buildHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — GrandCafe Cheers Newsletter</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 60px auto; padding: 20px; text-align: center; background: #0f0a0c; color: #f5f0ee; }
    h1 { color: #e8a030; margin-bottom: 16px; }
    .success { color: #4ade80; }
    .error { color: #f87171; }
    .info { color: #94a3b8; margin-top: 12px; font-size: 0.9rem; }
    .btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #e8a030; color: #000; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .btn:hover { background: #d4922a; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`
}
